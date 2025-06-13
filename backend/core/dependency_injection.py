"""
EngineerHub - 依賴注入容器

======================================================================================
🎯 設計目標：實現 IoC (Inversion of Control) 容器，管理所有依賴關係
======================================================================================

什麼是 IoC 容器？
- IoC 容器負責管理對象的創建、配置和生命週期
- 它實現了依賴注入模式，讓對象專注於業務邏輯而非依賴管理
- 容器根據配置自動注入所需的依賴項

設計模式：
- Singleton：容器本身是單例模式
- Factory：容器充當服務的工廠
- Registry：容器維護服務的註冊表
- Dependency Injection：自動注入依賴

生命週期管理：
- Singleton：整個應用生命週期中只有一個實例
- Transient：每次請求都創建新實例
- Scoped：在特定範圍內共享實例（如請求範圍）

======================================================================================
"""

from typing import Dict, Any, Callable, Optional, Type, TypeVar, get_type_hints, List
from enum import Enum
import inspect
import logging
from functools import wraps
from threading import Lock

# 泛型類型變量
T = TypeVar('T')

logger = logging.getLogger(__name__)


class ServiceLifetime(Enum):
    """
    服務生命週期枚舉
    
    📚 學習重點：
    - 不同生命週期模式的使用場景
    - 內存管理的考慮
    - 線程安全的重要性
    """
    SINGLETON = "singleton"      # 單例模式 - 整個應用只有一個實例
    TRANSIENT = "transient"      # 瞬態模式 - 每次都創建新實例
    SCOPED = "scoped"           # 作用域模式 - 在特定範圍內共享


class ServiceDescriptor:
    """
    服務描述符
    
    📚 學習重點：
    - 元數據的封裝
    - 服務註冊信息的管理
    - 工廠模式的應用
    
    🎯 單一職責：描述如何創建和管理服務實例
    """
    
    def __init__(
        self,
        service_type: Type[T],
        implementation_type: Optional[Type] = None,
        factory: Optional[Callable[..., T]] = None,
        lifetime: ServiceLifetime = ServiceLifetime.TRANSIENT,
        instance: Optional[T] = None
    ):
        """
        初始化服務描述符
        
        Args:
            service_type (Type[T]): 服務接口類型
            implementation_type (Optional[Type]): 實現類型
            factory (Optional[Callable[..., T]]): 工廠函數
            lifetime (ServiceLifetime): 生命週期
            instance (Optional[T]): 預創建的實例（用於單例）
        """
        self.service_type = service_type
        self.implementation_type = implementation_type
        self.factory = factory
        self.lifetime = lifetime
        self.instance = instance
        
        # 驗證配置的一致性
        self._validate_configuration()
    
    def _validate_configuration(self) -> None:
        """
        驗證服務描述符的配置是否有效
        
        Raises:
            ValueError: 當配置無效時
        """
        if not any([self.implementation_type, self.factory, self.instance]):
            raise ValueError(f"服務 {self.service_type.__name__} 必須提供實現類型、工廠函數或實例")
        
        if self.lifetime == ServiceLifetime.SINGLETON and self.instance is None:
            logger.debug(f"單例服務 {self.service_type.__name__} 將延遲創建")


class DependencyInjectionContainer:
    """
    依賴注入容器
    
    📚 學習重點：
    - 單例模式的實現
    - 線程安全的考慮
    - 循環依賴的檢測
    - 自動裝配的機制
    
    🎯 單一職責：管理所有服務的註冊、創建和生命週期
    
    使用範例：
    >>> container = DependencyInjectionContainer()
    >>> container.register_singleton(IUserRepository, UserRepository)
    >>> user_repo = container.resolve(IUserRepository)
    """
    
    _instance: Optional['DependencyInjectionContainer'] = None
    _lock = Lock()
    
    def __new__(cls) -> 'DependencyInjectionContainer':
        """
        實現單例模式
        
        📚 學習重點：
        - __new__ 方法的使用
        - 線程安全的單例實現
        - 雙重檢查鎖定模式
        """
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        """
        初始化容器
        
        注意：由於是單例模式，初始化只會執行一次
        """
        if not hasattr(self, '_initialized'):
            self._services: Dict[Type, ServiceDescriptor] = {}
            self._singletons: Dict[Type, Any] = {}
            self._scoped_instances: Dict[str, Dict[Type, Any]] = {}
            self._resolution_stack: List[Type] = []  # 用於檢測循環依賴
            self._initialized = True
            logger.info("依賴注入容器已初始化")
    
    # ======================================================================================
    # 📝 服務註冊方法 (Service Registration Methods)
    # ======================================================================================
    
    def register_singleton(
        self,
        service_type: Type[T],
        implementation_type: Optional[Type] = None,
        factory: Optional[Callable[..., T]] = None,
        instance: Optional[T] = None
    ) -> 'DependencyInjectionContainer':
        """
        註冊單例服務
        
        📚 學習重點：
        - 單例模式在 DI 中的應用
        - 記憶體效率的考慮
        - 狀態共享的風險
        
        Args:
            service_type (Type[T]): 服務接口類型
            implementation_type (Optional[Type]): 實現類型
            factory (Optional[Callable[..., T]]): 工廠函數
            instance (Optional[T]): 預創建的實例
        
        Returns:
            DependencyInjectionContainer: 支持方法鏈調用
        
        Examples:
            >>> # 註冊實現類型
            >>> container.register_singleton(IUserRepository, UserRepository)
            
            >>> # 註冊工廠函數
            >>> container.register_singleton(
            ...     ITokenManager, 
            ...     factory=lambda: JWTTokenManager(secret_key="...")
            ... )
            
            >>> # 註冊預創建實例
            >>> container.register_singleton(
            ...     ILogger, 
            ...     instance=logging.getLogger("app")
            ... )
        """
        descriptor = ServiceDescriptor(
            service_type=service_type,
            implementation_type=implementation_type,
            factory=factory,
            lifetime=ServiceLifetime.SINGLETON,
            instance=instance
        )
        
        self._services[service_type] = descriptor
        
        # 如果提供了實例，直接存儲
        if instance is not None:
            self._singletons[service_type] = instance
        
        logger.debug(f"已註冊單例服務: {service_type.__name__}")
        return self
    
    def register_transient(
        self,
        service_type: Type[T],
        implementation_type: Optional[Type] = None,
        factory: Optional[Callable[..., T]] = None
    ) -> 'DependencyInjectionContainer':
        """
        註冊瞬態服務
        
        📚 學習重點：
        - 瞬態模式的使用場景
        - 無狀態服務的設計
        - 性能與記憶體的權衡
        
        Args:
            service_type (Type[T]): 服務接口類型
            implementation_type (Optional[Type]): 實現類型
            factory (Optional[Callable[..., T]]): 工廠函數
        
        Returns:
            DependencyInjectionContainer: 支持方法鏈調用
        """
        descriptor = ServiceDescriptor(
            service_type=service_type,
            implementation_type=implementation_type,
            factory=factory,
            lifetime=ServiceLifetime.TRANSIENT
        )
        
        self._services[service_type] = descriptor
        logger.debug(f"已註冊瞬態服務: {service_type.__name__}")
        return self
    
    def register_scoped(
        self,
        service_type: Type[T],
        implementation_type: Optional[Type] = None,
        factory: Optional[Callable[..., T]] = None
    ) -> 'DependencyInjectionContainer':
        """
        註冊作用域服務
        
        📚 學習重點：
        - 作用域模式的實現
        - 請求級別的狀態管理
        - 資源清理的考慮
        
        Args:
            service_type (Type[T]): 服務接口類型
            implementation_type (Optional[Type]): 實現類型
            factory (Optional[Callable[..., T]]): 工廠函數
        
        Returns:
            DependencyInjectionContainer: 支持方法鏈調用
        """
        descriptor = ServiceDescriptor(
            service_type=service_type,
            implementation_type=implementation_type,
            factory=factory,
            lifetime=ServiceLifetime.SCOPED
        )
        
        self._services[service_type] = descriptor
        logger.debug(f"已註冊作用域服務: {service_type.__name__}")
        return self
    
    # ======================================================================================
    # 🔍 服務解析方法 (Service Resolution Methods)
    # ======================================================================================
    
    def resolve(self, service_type: Type[T], scope: Optional[str] = None) -> T:
        """
        解析服務實例
        
        📚 學習重點：
        - 服務解析的完整流程
        - 循環依賴的檢測機制
        - 自動裝配的實現
        
        Args:
            service_type (Type[T]): 要解析的服務類型
            scope (Optional[str]): 作用域標識（用於作用域服務）
        
        Returns:
            T: 服務實例
        
        Raises:
            ValueError: 當服務未註冊或存在循環依賴時
        """
        # 檢測循環依賴
        if service_type in self._resolution_stack:
            cycle = " -> ".join([t.__name__ for t in self._resolution_stack])
            cycle += f" -> {service_type.__name__}"
            raise ValueError(f"檢測到循環依賴: {cycle}")
        
        # 檢查服務是否已註冊
        if service_type not in self._services:
            raise ValueError(f"服務 {service_type.__name__} 未註冊")
        
        descriptor = self._services[service_type]
        
        try:
            # 將當前服務添加到解析堆疊
            self._resolution_stack.append(service_type)
            
            # 根據生命週期選擇解析策略
            if descriptor.lifetime == ServiceLifetime.SINGLETON:
                return self._resolve_singleton(descriptor)
            elif descriptor.lifetime == ServiceLifetime.SCOPED:
                return self._resolve_scoped(descriptor, scope or "default")
            else:  # TRANSIENT
                return self._resolve_transient(descriptor)
        
        finally:
            # 確保解析完成後從堆疊中移除
            if self._resolution_stack and self._resolution_stack[-1] == service_type:
                self._resolution_stack.pop()
    
    def _resolve_singleton(self, descriptor: ServiceDescriptor) -> Any:
        """
        解析單例服務
        
        📚 學習重點：
        - 懶加載的實現
        - 線程安全的考慮
        - 單例的緩存機制
        """
        service_type = descriptor.service_type
        
        # 檢查是否已經創建實例
        if service_type in self._singletons:
            return self._singletons[service_type]
        
        # 線程安全地創建實例
        with self._lock:
            if service_type in self._singletons:
                return self._singletons[service_type]
            
            instance = self._create_instance(descriptor)
            self._singletons[service_type] = instance
            logger.debug(f"已創建單例實例: {service_type.__name__}")
            return instance
    
    def _resolve_scoped(self, descriptor: ServiceDescriptor, scope: str) -> Any:
        """
        解析作用域服務
        
        📚 學習重點：
        - 作用域的實現機制
        - 範圍內的實例共享
        - 作用域清理的重要性
        """
        service_type = descriptor.service_type
        
        # 確保作用域存在
        if scope not in self._scoped_instances:
            self._scoped_instances[scope] = {}
        
        scope_instances = self._scoped_instances[scope]
        
        # 檢查作用域內是否已有實例
        if service_type in scope_instances:
            return scope_instances[service_type]
        
        # 創建新實例並存儲在作用域內
        instance = self._create_instance(descriptor)
        scope_instances[service_type] = instance
        logger.debug(f"已創建作用域實例: {service_type.__name__} (scope: {scope})")
        return instance
    
    def _resolve_transient(self, descriptor: ServiceDescriptor) -> Any:
        """
        解析瞬態服務
        
        📚 學習重點：
        - 瞬態服務的特點
        - 每次創建新實例的意義
        - 性能考慮
        """
        instance = self._create_instance(descriptor)
        logger.debug(f"已創建瞬態實例: {descriptor.service_type.__name__}")
        return instance
    
    def _create_instance(self, descriptor: ServiceDescriptor) -> Any:
        """
        創建服務實例
        
        📚 學習重點：
        - 工廠模式的應用
        - 構造函數注入的實現
        - 自動裝配的邏輯
        """
        # 如果已有實例，直接返回
        if descriptor.instance is not None:
            return descriptor.instance
        
        # 如果有工廠函數，使用工廠創建
        if descriptor.factory is not None:
            return self._invoke_factory(descriptor.factory)
        
        # 使用實現類型創建
        if descriptor.implementation_type is not None:
            return self._create_from_type(descriptor.implementation_type)
        
        raise ValueError(f"無法創建 {descriptor.service_type.__name__} 的實例")
    
    def _invoke_factory(self, factory: Callable) -> Any:
        """
        調用工廠函數創建實例
        
        📚 學習重點：
        - 工廠函數的參數注入
        - 反射的使用
        - 動態調用的實現
        """
        # 獲取工廠函數的參數
        sig = inspect.signature(factory)
        kwargs = {}
        
        # 為每個參數解析依賴
        for param_name, param in sig.parameters.items():
            if param.annotation != inspect.Parameter.empty:
                kwargs[param_name] = self.resolve(param.annotation)
        
        return factory(**kwargs)
    
    def _create_from_type(self, implementation_type: Type) -> Any:
        """
        從類型創建實例
        
        📚 學習重點：
        - 構造函數注入的實現
        - 類型提示的使用
        - 自動依賴解析
        """
        # 獲取構造函數的參數
        sig = inspect.signature(implementation_type.__init__)
        kwargs = {}
        
        # 為每個參數解析依賴（跳過 self 參數）
        for param_name, param in sig.parameters.items():
            if param_name == 'self':
                continue
            
            if param.annotation != inspect.Parameter.empty:
                kwargs[param_name] = self.resolve(param.annotation)
        
        return implementation_type(**kwargs)
    
    # ======================================================================================
    # 🧹 容器管理方法 (Container Management Methods)
    # ======================================================================================
    
    def clear_scope(self, scope: str) -> None:
        """
        清理指定作用域的所有實例
        
        📚 學習重點：
        - 資源清理的重要性
        - 記憶體洩漏的預防
        - 作用域生命週期的管理
        
        Args:
            scope (str): 要清理的作用域標識
        """
        if scope in self._scoped_instances:
            instance_count = len(self._scoped_instances[scope])
            del self._scoped_instances[scope]
            logger.debug(f"已清理作用域 '{scope}' 的 {instance_count} 個實例")
    
    def is_registered(self, service_type: Type) -> bool:
        """
        檢查服務是否已註冊
        
        Args:
            service_type (Type): 服務類型
        
        Returns:
            bool: 是否已註冊
        """
        return service_type in self._services
    
    def get_service_info(self, service_type: Type) -> Optional[Dict[str, Any]]:
        """
        獲取服務註冊信息
        
        Args:
            service_type (Type): 服務類型
        
        Returns:
            Optional[Dict[str, Any]]: 服務信息字典
        """
        if service_type not in self._services:
            return None
        
        descriptor = self._services[service_type]
        return {
            'service_type': descriptor.service_type.__name__,
            'implementation_type': descriptor.implementation_type.__name__ if descriptor.implementation_type else None,
            'lifetime': descriptor.lifetime.value,
            'has_factory': descriptor.factory is not None,
            'has_instance': descriptor.instance is not None
        }


# ======================================================================================
# 🎨 裝飾器支持 (Decorator Support)
# ======================================================================================

def injectable(lifetime: ServiceLifetime = ServiceLifetime.TRANSIENT):
    """
    可注入服務裝飾器
    
    📚 學習重點：
    - 裝飾器模式的應用
    - 元編程的技巧
    - 自動註冊的實現
    
    Args:
        lifetime (ServiceLifetime): 服務生命週期
    
    Examples:
        >>> @injectable(ServiceLifetime.SINGLETON)
        >>> class UserService:
        ...     def __init__(self, repo: IUserRepository):
        ...         self.repo = repo
    """
    def decorator(cls):
        # 在類上添加註冊信息
        cls._di_lifetime = lifetime
        cls._di_injectable = True
        return cls
    return decorator


def auto_wire(container: DependencyInjectionContainer):
    """
    自動裝配裝飾器
    
    📚 學習重點：
    - 自動裝配的概念
    - 函數參數的動態注入
    - AOP (面向切面編程) 的應用
    
    Args:
        container (DependencyInjectionContainer): DI 容器
    
    Examples:
        >>> @auto_wire(container)
        >>> def create_user(user_service: IUserService, data: dict):
        ...     return user_service.create(data)
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # 獲取函數簽名
            sig = inspect.signature(func)
            bound_args = sig.bind_partial(*args, **kwargs)
            
            # 為未提供的參數注入依賴
            for param_name, param in sig.parameters.items():
                if param_name not in bound_args.arguments:
                    if param.annotation != inspect.Parameter.empty:
                        if container.is_registered(param.annotation):
                            bound_args.arguments[param_name] = container.resolve(param.annotation)
            
            return func(*bound_args.args, **bound_args.kwargs)
        return wrapper
    return decorator


# ======================================================================================
# 🌐 全局容器實例 (Global Container Instance)
# ======================================================================================

# 全局容器實例 - 在整個應用中共享
container = DependencyInjectionContainer()

# 便捷函數，用於全局容器操作
def register_singleton(service_type: Type[T], implementation_type: Type = None, **kwargs) -> None:
    """全局容器的單例註冊便捷函數"""
    container.register_singleton(service_type, implementation_type, **kwargs)

def register_transient(service_type: Type[T], implementation_type: Type = None, **kwargs) -> None:
    """全局容器的瞬態註冊便捷函數"""
    container.register_transient(service_type, implementation_type, **kwargs)

def resolve(service_type: Type[T]) -> T:
    """全局容器的解析便捷函數"""
    return container.resolve(service_type) 
"""
服務層基礎架構
提供依賴注入、錯誤處理和基礎服務類
"""

from typing import TypeVar, Generic, Optional, List, Dict, Any
from abc import ABC, abstractmethod
import logging
from django.db import models, transaction
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.exceptions import ValidationError as DRFValidationError

# 泛型類型變量
T = TypeVar('T', bound=models.Model)

class ServiceError(Exception):
    """服務層錯誤基類"""
    def __init__(self, message: str, code: str = 'service_error', details: Optional[Dict[str, Any]] = None):
        self.message = message
        self.code = code
        self.details = details or {}
        super().__init__(message)


class NotFoundError(ServiceError):
    """資源未找到錯誤"""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, 'not_found', details)


class PermissionError(ServiceError):
    """權限錯誤"""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, 'permission_denied', details)


class BusinessLogicError(ServiceError):
    """業務邏輯錯誤"""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, 'business_logic_error', details)


class BaseService(ABC, Generic[T]):
    """
    基礎服務類
    提供通用的 CRUD 操作和錯誤處理
    """
    model_class: type[T] = None
    logger_name: str = 'engineerhub.services'
    
    def __init__(self):
        self.logger = logging.getLogger(self.logger_name)
        if not self.model_class:
            raise ValueError("model_class must be defined")
    
    def get(self, **kwargs) -> T:
        """獲取單個實例"""
        try:
            return self.model_class.objects.get(**kwargs)
        except self.model_class.DoesNotExist:
            raise NotFoundError(f"{self.model_class.__name__} not found", {"filters": kwargs})
        except Exception as e:
            self.logger.error(f"Error getting {self.model_class.__name__}: {str(e)}")
            raise ServiceError(f"Failed to get {self.model_class.__name__}", details={"error": str(e)})
    
    def filter(self, **kwargs) -> models.QuerySet[T]:
        """過濾實例"""
        try:
            return self.model_class.objects.filter(**kwargs)
        except Exception as e:
            self.logger.error(f"Error filtering {self.model_class.__name__}: {str(e)}")
            raise ServiceError(f"Failed to filter {self.model_class.__name__}", details={"error": str(e)})
    
    def create(self, **kwargs) -> T:
        """創建實例"""
        try:
            with transaction.atomic():
                instance = self.model_class(**kwargs)
                instance.full_clean()
                instance.save()
                self.logger.info(f"Created {self.model_class.__name__} with id {instance.pk}")
                return instance
        except (DjangoValidationError, DRFValidationError) as e:
            self.logger.warning(f"Validation error creating {self.model_class.__name__}: {str(e)}")
            raise BusinessLogicError(f"Invalid data for {self.model_class.__name__}", details={"errors": str(e)})
        except Exception as e:
            self.logger.error(f"Error creating {self.model_class.__name__}: {str(e)}")
            raise ServiceError(f"Failed to create {self.model_class.__name__}", details={"error": str(e)})
    
    def update(self, instance: T, **kwargs) -> T:
        """更新實例"""
        try:
            with transaction.atomic():
                for key, value in kwargs.items():
                    setattr(instance, key, value)
                instance.full_clean()
                instance.save()
                self.logger.info(f"Updated {self.model_class.__name__} with id {instance.pk}")
                return instance
        except (DjangoValidationError, DRFValidationError) as e:
            self.logger.warning(f"Validation error updating {self.model_class.__name__}: {str(e)}")
            raise BusinessLogicError(f"Invalid data for {self.model_class.__name__}", details={"errors": str(e)})
        except Exception as e:
            self.logger.error(f"Error updating {self.model_class.__name__}: {str(e)}")
            raise ServiceError(f"Failed to update {self.model_class.__name__}", details={"error": str(e)})
    
    def delete(self, instance: T) -> None:
        """刪除實例"""
        try:
            with transaction.atomic():
                instance_id = instance.pk
                instance.delete()
                self.logger.info(f"Deleted {self.model_class.__name__} with id {instance_id}")
        except Exception as e:
            self.logger.error(f"Error deleting {self.model_class.__name__}: {str(e)}")
            raise ServiceError(f"Failed to delete {self.model_class.__name__}", details={"error": str(e)})
    
    def bulk_create(self, instances: List[T]) -> List[T]:
        """批量創建實例"""
        try:
            with transaction.atomic():
                created = self.model_class.objects.bulk_create(instances)
                self.logger.info(f"Bulk created {len(created)} {self.model_class.__name__} instances")
                return created
        except Exception as e:
            self.logger.error(f"Error bulk creating {self.model_class.__name__}: {str(e)}")
            raise ServiceError(f"Failed to bulk create {self.model_class.__name__}", details={"error": str(e)})


class ServiceRegistry:
    """
    服務註冊表
    實現簡單的依賴注入容器
    """
    _services: Dict[str, Any] = {}
    
    @classmethod
    def register(cls, name: str, service: Any) -> None:
        """註冊服務"""
        cls._services[name] = service
    
    @classmethod
    def get(cls, name: str) -> Any:
        """獲取服務"""
        if name not in cls._services:
            raise ValueError(f"Service '{name}' not registered")
        return cls._services[name]
    
    @classmethod
    def clear(cls) -> None:
        """清空註冊表（主要用於測試）"""
        cls._services.clear()


# 服務裝飾器
def register_service(name: str):
    """
    服務註冊裝飾器
    用法：
    @register_service('post_service')
    class PostService(BaseService):
        pass
    """
    def decorator(service_class):
        ServiceRegistry.register(name, service_class())
        return service_class
    return decorator
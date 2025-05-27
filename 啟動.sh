docker compose -f docker-compose.dev.yml up -d postgres redis adminer django
docker compose -f docker-compose.dev.yml ps
docker compose -f docker-compose.dev.yml run --rm django python manage.py makemigrations
docker compose -f docker-compose.dev.yml run --rm django python manage.py migrate
docker compose -f docker-compose.dev.yml run --rm django python manage.py algolia_reindex --batchsize 500
docker compose -f docker-compose.dev.yml run --rm django python manage.py runserver
#chmod +x 啟動.sh  (給權限)
#./啟動.sh
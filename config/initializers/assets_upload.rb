# frozen_string_literal: true

# Создаем директорию для загрузок при старте приложения
FileUtils.mkdir_p(Rails.root.join("public", "uploads"))

# Добавляем путь uploads в список статических файлов
Rails.application.config.assets.paths << Rails.root.join("public", "uploads")

import { Controller } from "@hotwired/stimulus"
import grapesjs from "grapesjs"
import basicBlocks from "grapesjs-blocks-basic";
import presetWebpage from "grapesjs-preset-webpage";

export default class extends Controller {
  static targets = ["editor"]
  static values = {
    content: String,
    updateUrl: String
  }

  connect() {
    console.log("TemplateEditorController connected")
    setTimeout(() => {
      this.initializeEditor()
    }, 100)
  }

  initializeEditor() {
    try {
      // Парсим начальные данные для передачи в projectData
      let initialProjectData = null
      try {
        const content = this.contentValue
        if (content && content !== '{}' && content !== '') {
          initialProjectData = JSON.parse(content)
          console.log("Loading project data:", initialProjectData)
        }
      } catch (error) {
        console.warn("Error parsing initial data:", error)
      }

      this.editor = grapesjs.init({
        container: this.editorTarget,
        height: "calc(100vh - 80px)",
        width: "100%",
        
        // Передаем начальные данные как projectData (рекомендуется в документации)
        projectData: initialProjectData || {
          pages: [{
            component: '<div style="padding: 20px; text-align: center;">Начните создавать ваш шаблон...</div>'
          }]
        },
        
        // Базовые настройки
        fromElement: false,
        showOffsets: true,
        noticeOnUnload: false,
        
        // Настраиваем custom storage для Rails backend
        storageManager: {
          type: 'rails-remote',
          autosave: false, // Отключаем автосохранение, будем сохранять вручную
          autoload: false, // Отключаем автозагрузку, загружаем через projectData
          options: {
            'rails-remote': {
              updateUrl: this.updateUrlValue
            }
          }
        },
        
        // Плагины
        plugins: [basicBlocks, presetWebpage],
        pluginsOpts: {
          "gjs-blocks-basic": {
            flexGrid: true,
            blocks: ["column1", "column2", "column3", "text", "link", "image", "video"],
          },
          "grapesjs-preset-webpage": {
            blocks: ["link-block", "quote", "text-basic"],
          },
        },
        
        // Базовые стили
        canvas: {
          styles: [
            'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
          ]
        }
      })

      // Добавляем custom storage для Rails backend
      this.setupRailsStorage()

      // Автосохранение каждые 30 секунд
      this.autoSaveInterval = setInterval(() => {
        this.save(false)
      }, 30000)

      console.log("GrapesJS editor initialized successfully with projectData")
      
    } catch (error) {
      console.error('Ошибка инициализации GrapesJS:', error)
      this.showNotification("❌ Ошибка инициализации редактора", "error")
    }
  }

  setupRailsStorage() {
    // Создаем custom storage согласно документации
    this.editor.Storage.add('rails-remote', {
      async load(options = {}) {
        // В нашем случае данные уже загружены через projectData
        // Этот метод нужен для совместимости с API
        console.log("Storage load called (data already loaded via projectData)")
        return {}
      },

      async store(projectData, options = {}) {
        try {
          console.log("Storing project data:", projectData)
          
          const response = await fetch(options.updateUrl, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "X-CSRF-Token": document.querySelector("meta[name=csrf-token]").content
            },
            body: JSON.stringify({ 
              template: { 
                data: projectData
              } 
            })
          })

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }

          console.log("Project data stored successfully")
          return projectData
        } catch (error) {
          console.error("Storage error:", error)
          throw error
        }
      }
    })
  }

  async save(showNotification = true) {
    if (!this.editor) {
      console.warn("Editor not initialized")
      return
    }

    try {
      // Используем рекомендованный метод getProjectData()
      const projectData = this.editor.getProjectData()
      console.log("Getting project data for save:", projectData)
      
      // Используем встроенный store() метод который вызовет наш custom storage
      await this.editor.store()
      
      if (showNotification) {
        this.showNotification("✅ Шаблон успешно сохранен!", "success")
      }
      
    } catch (error) {
      console.error('Ошибка сохранения:', error)
      if (showNotification) {
        this.showNotification("❌ Ошибка при сохранении: " + error.message, "error")
      }
    }
  }

  showNotification(message, type = "info") {
    const notification = document.createElement("div")
    notification.className = `fixed top-4 right-4 px-4 py-2 rounded-md shadow-lg z-50 ${
      type === "success" ? "bg-green-500 text-white" : 
      type === "error" ? "bg-red-500 text-white" : 
      "bg-blue-500 text-white"
    }`
    notification.textContent = message
    
    document.body.appendChild(notification)
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification)
      }
    }, 3000)
  }

  disconnect() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval)
    }
    
    if (this.editor) {
      try {
        this.editor.destroy()
      } catch (error) {
        console.warn("Error destroying editor:", error)
      }
      this.editor = null
    }
  }
}
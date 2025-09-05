import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["modal", "variableList", "searchInput"]
  static values = { editorController: String }

  connect() {
    console.log("Variable Picker Controller connected")
    this.setupVariables()
  }

  setupVariables() {
    // Определяем доступные переменные на основе JSON структуры
    this.variables = [
      {
        category: "Основная информация",
        items: [
          { key: "name", label: "Имя", example: "Ivan B." },
          { key: "current_role", label: "Текущая роль", example: "Python developer" }
        ]
      },
      {
        category: "Проекты",
        items: [
          { key: "projects[0].title", label: "Название первого проекта", example: "Project 1" },
          { key: "projects[0].project_name", label: "Имя первого проекта", example: "NDA" },
          { key: "projects[0].overview", label: "Описание первого проекта", example: "Developed API interfaces..." },
          { key: "projects[0].technologies", label: "Технологии первого проекта", example: "FastAPI, Docker, Kubernetes" },
          { key: "projects[0].role", label: "Роль в первом проекте", example: "Python Software Developer" },
          { key: "projects[0].common_tasks", label: "Задачи в первом проекте", example: "• Develop API interfaces..." },
          { key: "projects[0].duration", label: "Длительность первого проекта", example: "9 months" }
        ]
      },
      {
        category: "Навыки и квалификация",
        items: [
          { key: "skills_qualifications[0].title", label: "Название первого навыка", example: "Programming Languages" },
          { key: "skills_qualifications[0].description", label: "Описание первого навыка", example: "Python, JavaScript" },
          { key: "skills_qualifications[1].title", label: "Название второго навыка", example: "Backend Frameworks" },
          { key: "skills_qualifications[1].description", label: "Описание второго навыка", example: "Django, FastAPI" },
          { key: "skills_qualifications[2].title", label: "Название третьего навыка", example: "Cloud Services" },
          { key: "skills_qualifications[2].description", label: "Описание третьего навыка", example: "AWS" }
        ]
      },
      {
        category: "Циклы",
        items: [
          { key: "#each skills_qualifications", label: "Цикл по всем навыкам", example: "{{#each skills_qualifications}}...{{/each}}" },
          { key: "#each projects", label: "Цикл по всем проектам", example: "{{#each projects}}...{{/each}}" },
          { key: "#each languages", label: "Цикл по всем языкам", example: "{{#each languages}}...{{/each}}" },
          { key: "title", label: "Название (внутри цикла)", example: "{{title}}" },
          { key: "description", label: "Описание (внутри цикла)", example: "{{description}}" },
          { key: "@index", label: "Индекс элемента в цикле", example: "{{@index}}" }
        ]
      },
      {
        category: "Языки",
        items: [
          { key: "languages[0].title", label: "Название первого языка", example: "English" },
          { key: "languages[0].level", label: "Уровень первого языка", example: "Upper-Intermediate" }
        ]
      }
    ]
    
    this.renderVariables()
  }

  renderVariables() {
    if (!this.hasVariableListTarget) return

    const html = this.variables.map(category => `
      <div class="mb-6">
        <h3 class="text-sm font-medium text-gray-900 mb-3">${category.category}</h3>
        <div class="space-y-1">
          ${category.items.map(item => `
            <button type="button" 
                    data-action="click->variable-picker#selectVariable"
                    data-variable-key="${item.key}"
                    data-variable-label="${item.label}"
                    class="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-blue-50 hover:text-blue-700 transition-colors">
              <div class="font-medium">${item.label}</div>
              <div class="text-xs text-gray-500 mt-1">{{${item.key}}}</div>
              <div class="text-xs text-gray-400 mt-1">Пример: ${item.example}</div>
            </button>
          `).join('')}
        </div>
      </div>
    `).join('')

    this.variableListTarget.innerHTML = html
  }

  showModal() {
    this.modalTarget.classList.remove('hidden')
    if (this.hasSearchInputTarget) {
      this.searchInputTarget.focus()
    }
  }

  hideModal() {
    this.modalTarget.classList.add('hidden')
    if (this.hasSearchInputTarget) {
      this.searchInputTarget.value = ''
    }
    this.renderVariables() // Сбрасываем фильтр
  }

  selectVariable(event) {
    const key = event.currentTarget.dataset.variableKey
    const label = event.currentTarget.dataset.variableLabel
    
    // Получаем ссылку на editor controller
    const editorElement = document.querySelector('[data-controller*="editor"]')
    if (editorElement) {
      const editorController = this.application.getControllerForElementAndIdentifier(editorElement, 'editor')
      if (editorController && editorController.insertVariable) {
        // Проверяем, является ли это циклом
        if (key.startsWith('#each ')) {
          const arrayName = key.replace('#each ', '')
          editorController.insertLoop(arrayName, label)
        } else {
          editorController.insertVariable(key, label)
        }
      }
    }
    
    this.hideModal()
  }

  search() {
    if (!this.hasSearchInputTarget) return
    
    const query = this.searchInputTarget.value.toLowerCase()
    
    if (query === '') {
      this.renderVariables()
      return
    }

    const filteredVariables = this.variables.map(category => ({
      ...category,
      items: category.items.filter(item => 
        item.label.toLowerCase().includes(query) || 
        item.key.toLowerCase().includes(query)
      )
    })).filter(category => category.items.length > 0)

    const html = filteredVariables.map(category => `
      <div class="mb-6">
        <h3 class="text-sm font-medium text-gray-900 mb-3">${category.category}</h3>
        <div class="space-y-1">
          ${category.items.map(item => `
            <button type="button" 
                    data-action="click->variable-picker#selectVariable"
                    data-variable-key="${item.key}"
                    data-variable-label="${item.label}"
                    class="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-blue-50 hover:text-blue-700 transition-colors">
              <div class="font-medium">${item.label}</div>
              <div class="text-xs text-gray-500 mt-1">{{${item.key}}}</div>
              <div class="text-xs text-gray-400 mt-1">Пример: ${item.example}</div>
            </button>
          `).join('')}
        </div>
      </div>
    `).join('')

    this.variableListTarget.innerHTML = html
  }

  // Обработка клика вне модального окна
  handleOutsideClick(event) {
    if (event.target === this.modalTarget) {
      this.hideModal()
    }
  }
}

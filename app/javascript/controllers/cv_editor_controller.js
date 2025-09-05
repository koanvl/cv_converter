// app/javascript/controllers/editor_controller.js

import { Controller } from "@hotwired/stimulus"
import { Editor } from "@tiptap/core"
import { TextSelection } from 'prosemirror-state'

// --- Tiptap Extensions ---
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import Link from "@tiptap/extension-link"
import Image from "@tiptap/extension-image"
import TextAlign from "@tiptap/extension-text-align"


// --- Stimulus Controller ---
export default class extends Controller {
  static targets = ["element", "input", "fileInput", "form"]

  connect() {
    this.editor = new Editor({
      element: this.elementTarget,
      extensions: [
        StarterKit,
        Placeholder.configure({ placeholder: "Start typing..." }),
        Link.configure({ openOnClick: true, autolink: true }),
        Image,
        TextAlign.configure({ types: ["heading", "paragraph"] }),
      ],
      editorProps: {
        handleDrop: (view, event, slice, moved) => {
          const text = event.dataTransfer.getData('text/plain');
          if (text && text.startsWith('{{') && text.endsWith('}}')) {
            const { tr } = view.state;
            const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });
            if (coordinates) {
              tr.insertText(text, coordinates.pos);
              view.dispatch(tr);
              return true;
            }
          }
          return false;
        },
      },
      content: this.inputTarget.value,
      onUpdate: ({ editor }) => {
        
        // Сохраняем HTML
        this.inputTarget.value = editor.getHTML()
      },
      onCreate: ({ editor }) => {

      },
    })
  }

  disconnect() {
    this.editor?.destroy()
  }

  save(event) {
    event.preventDefault()
    this.inputTarget.value = this.editor.getHTML()
    this.formTarget.requestSubmit()
  }

  // === Базовое форматирование ===
  toggleBold() { this.editor.chain().focus().toggleBold().run() }
  toggleItalic() { this.editor.chain().focus().toggleItalic().run() }
  toggleStrike() { this.editor.chain().focus().toggleStrike().run() }
  toggleUnderline() { this.editor.chain().focus().toggleUnderline().run() }

  // === Структура текста ===
  toggleHeading(e) { this.editor.chain().focus().toggleHeading({ level: +e.currentTarget.dataset.level }).run() }
  toggleBulletList() { this.editor.chain().focus().toggleBulletList().run() }
  toggleOrderedList() { this.editor.chain().focus().toggleOrderedList().run() }
  toggleBlockquote() { this.editor.chain().focus().toggleBlockquote().run() }
  toggleCodeBlock() { this.editor.chain().focus().toggleCodeBlock().run() }
  insertHorizontalRule() { this.editor.chain().focus().setHorizontalRule().run() }

  // === Ссылки ===
  setLink() {
    const previousUrl = this.editor.getAttributes('link').href
    const url = window.prompt("URL", previousUrl)
    if (url === null) return
    if (url === "") {
      this.editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    this.editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }
  unsetLink() { this.editor.chain().focus().unsetLink().run() }
  
  // === Выравнивание ===
  setAlign(e) { this.editor.chain().focus().setTextAlign(e.currentTarget.dataset.align).run() }

  // === Загрузка изображений ===
  triggerImageUpload() {
    this.fileInputTarget.click()
  }

  async handleFileUpload(event) {
    const file = event.target.files[0]
    if (!file || !file.type.startsWith("image/")) return

    try {
      this.#showNotification("Загрузка изображения...", "info")
      const data = await this.#uploadFile(file)

      if (!data.url) throw new Error("Неверный ответ от сервера")

      this.editor.chain().focus().setImage({ src: data.url }).run()
      this.#showNotification("Изображение успешно загружено", "success")
    } catch (error) {
      console.error("Ошибка загрузки:", error)
      this.#showNotification(`Ошибка: ${error.message}`, "error")
    } finally {
      event.target.value = "" // Сбрасываем инпут для повторной загрузки того же файла
    }
  }

  async #uploadFile(file) {
    const formData = new FormData()
    formData.append("file", file)

    const csrfToken = document.querySelector("meta[name='csrf-token']")?.content
    if (!csrfToken) throw new Error("CSRF токен не найден")

    const response = await fetch("/upload_image", {
      method: "POST",
      headers: { "X-CSRF-Token": csrfToken, "Accept": "application/json" },
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `Ошибка сервера: ${response.status}`)
    }

    return response.json()
  }
  
  // === Уведомления ===
  #showNotification(message, type = "info") {
    const notification = document.createElement("div")
    const typeClasses = {
      success: "bg-green-500 text-white",
      error: "bg-red-500 text-white",
      info: "bg-blue-500 text-white",
    }
    notification.className = `fixed top-4 right-4 px-4 py-2 rounded-md shadow-lg z-50 ${typeClasses[type] || typeClasses.info}`
    notification.textContent = message
    document.body.appendChild(notification)
    setTimeout(() => {
      notification.remove()
    }, 3000)
  }
}
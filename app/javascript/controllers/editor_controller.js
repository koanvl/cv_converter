import { Controller } from "@hotwired/stimulus"
import { Editor } from "@tiptap/core"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import Heading from "@tiptap/extension-heading"
import Bold from "@tiptap/extension-bold"
import Italic from "@tiptap/extension-italic"
import Strike from "@tiptap/extension-strike"
import Underline from "@tiptap/extension-underline"
import Link from "@tiptap/extension-link"
import Image from "@tiptap/extension-image"
import Blockquote from "@tiptap/extension-blockquote"
import CodeBlock from "@tiptap/extension-code-block"
import ListItem from "@tiptap/extension-list-item"
import BulletList from "@tiptap/extension-bullet-list"
import OrderedList from "@tiptap/extension-ordered-list"
import HorizontalRule from "@tiptap/extension-horizontal-rule"
import TextAlign from "@tiptap/extension-text-align"

export default class extends Controller {
  static targets = ["element", "input", "fileInput", "form"]

  connect() {
    this.editor = new Editor({
      element: this.elementTarget,
      extensions: [
        StarterKit.configure({ 
          heading: {
            levels: [1, 2, 3]
          }
        }),
        Heading.extend({
          addAttributes() {
            return {
              ...this.parent?.(),
              style: {
                default: null,
                renderHTML: (attributes) => {
                  const level = attributes.level
                  switch(level) {
                    case 1:
                      return { style: "font-size: 24px; font-weight: bold; color: #000000;" }
                    case 2:
                      return { style: "font-size: 20px; font-weight: bold; color: #000000;" }
                    case 3:
                      return { style: "font-size: 16px; font-weight: bold; color: #000000;" }
                    default:
                      return {}
                  }
                }
              }
            }
          }
        }).configure({ levels: [1, 2, 3] }),
        Placeholder.configure({ placeholder: "Start writing..." }),
        Bold.configure({
          HTMLAttributes: {
            style: "font-weight: bold;"
          }
        }),
        Italic.configure({
          HTMLAttributes: {
            style: "font-style: italic;"
          }
        }),
        Strike.configure({
          HTMLAttributes: {
            style: "text-decoration: line-through;"
          }
        }),
        Underline.configure({
          HTMLAttributes: {
            style: "text-decoration: underline;"
          }
        }),
        Link.configure({ 
          openOnClick: true,
          HTMLAttributes: {
            style: "color: #0066cc; text-decoration: underline;"
          }
        }),
        Image.configure({
          HTMLAttributes: {
            style: "max-width: 100%; height: auto; margin: 1rem 0;"
          }
        }),
        Blockquote.configure({
          HTMLAttributes: {
            style: "border-left: 4px solid #e2e8f0; padding-left: 1rem; margin: 1rem 0; font-style: italic;"
          }
        }),
        CodeBlock.configure({
          HTMLAttributes: {
            style: "background-color: #f7fafc; padding: 1rem; border-radius: 4px; font-family: monospace;"
          }
        }),
        ListItem.configure({
          HTMLAttributes: {
            style: "margin-bottom: 4px; font-size: 16px; color: #000000;"
          }
        }),
        BulletList.configure({
          HTMLAttributes: {
            style: "font-size: 14px; color: #000000;"
          }
        }),
        OrderedList.configure({
          HTMLAttributes: {
            style: "font-size: 14px; color: #000000;"
          }
        }),
        HorizontalRule.configure({
          HTMLAttributes: {
            style: "border: none; border-top: 2px solid #e2e8f0; margin: 1rem 0;"
          }
        }),
        TextAlign.configure({
          types: ["heading", "paragraph", "image"],
          defaultAlignment: "left"
        }),
      ],
      content: this.inputTarget.value,
      onUpdate: ({ editor }) => {
        this.inputTarget.value = editor.getHTML()
      },
    })
  }

  disconnect() {
    if (this.editor) {
      this.editor.destroy()
    }
  }

  save(event) {
    event.preventDefault()
    this.showNotification("Saving...", "info")
    this.inputTarget.value = this.editor.getHTML()
    this.formTarget.requestSubmit()
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

  // Toolbar actions
  toggleBold() { this.editor.chain().focus().toggleBold().run() }
  toggleItalic() { this.editor.chain().focus().toggleItalic().run() }
  toggleStrike() { this.editor.chain().focus().toggleStrike().run() }
  toggleUnderline() { this.editor.chain().focus().toggleUnderline().run() }
  
  toggleHeading(event) {
    const level = parseInt(event.currentTarget.dataset.level)
    this.editor.chain().focus().toggleHeading({ level }).run()
  }
  
  toggleBulletList() { this.editor.chain().focus().toggleBulletList().run() }
  toggleOrderedList() { this.editor.chain().focus().toggleOrderedList().run() }
  toggleBlockquote() { this.editor.chain().focus().toggleBlockquote().run() }
  toggleCodeBlock() { this.editor.chain().focus().toggleCodeBlock().run() }
  insertHorizontalRule() { this.editor.chain().focus().setHorizontalRule().run() }
  
  triggerImageUpload() {
    this.fileInputTarget.click()
  }

  async handleFileUpload(event) {
    try {
      const file = event.target.files[0]
      if (!file) return

      if (!file.type.startsWith("image/")) {
        throw new Error("Please select an image file")
      }

      const formData = new FormData()
      formData.append("file", file)

      const csrfToken = document.querySelector("meta[name='csrf-token']")?.content
      if (!csrfToken) {
        throw new Error("CSRF token not found")
      }

      this.showNotification("Uploading image...", "info")

      const response = await fetch("/upload_image", {
        method: "POST",
        headers: {
          "X-CSRF-Token": csrfToken,
          "Accept": "application/json"
        },
        body: formData,
        credentials: "same-origin"
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Upload failed: ${response.status}`)
      }

      const data = await response.json()
      if (!data.url) {
        throw new Error("Invalid server response")
      }

      this.editor.chain().focus().setImage({ src: data.url }).run()
      this.showNotification("Image uploaded successfully", "success")
    } catch (error) {
      console.error("Upload error:", error)
      this.showNotification(`Upload failed: ${error.message}`, "error")
    } finally {
      event.target.value = ""
    }
  }

  setLink() {
    const url = prompt("Enter URL:")
    if (url) {
      this.editor.chain().focus().setLink({ href: url }).run()
    }
  }

  unsetLink() {
    this.editor.chain().focus().unsetLink().run()
  }

  setAlignLeft() { this.editor.chain().focus().setTextAlign("left").run() }
  setAlignCenter() { this.editor.chain().focus().setTextAlign("center").run() }
  setAlignRight() { this.editor.chain().focus().setTextAlign("right").run() }
  setAlignJustify() { this.editor.chain().focus().setTextAlign("justify").run() }
}
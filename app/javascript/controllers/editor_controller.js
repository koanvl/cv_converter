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
    console.log("Editor controller connected")
    console.log("Form target:", this.formTarget)
    console.log("Input target:", this.inputTarget)
    console.log("Element target:", this.elementTarget)

    this.editor = new Editor({
      element: this.elementTarget,
      extensions: [
        StarterKit.configure({ history: true }),
        Placeholder.configure({ placeholder: "Start writing..." }),
        Heading.configure({ levels: [1, 2, 3] }),
        Bold,
        Italic,
        Strike,
        Underline,
        Link.configure({ openOnClick: true }),
        Image,
        Blockquote,
        CodeBlock,
        ListItem,
        BulletList,
        OrderedList,
        HorizontalRule,
        TextAlign.configure({
          types: ['heading', 'paragraph', 'image']
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
    console.log("Save button clicked")
    
    try {
      this.showNotification("Saving...", "info")
      
      // Update hidden input with current content
      this.inputTarget.value = this.editor.getHTML()
      console.log("Updated content:", this.inputTarget.value)
      
      // Submit the form
      console.log("Form target before submit:", this.formTarget)
      this.formTarget.requestSubmit()
    } catch (error) {
      console.error("Save error:", error)
      this.showNotification("Error saving: " + error.message, "error")
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

      if (!file.type.startsWith('image/')) {
        throw new Error('Please select an image file')
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
        body: formData,
        headers: {
          "X-CSRF-Token": csrfToken
        }
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
      this.editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run()
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
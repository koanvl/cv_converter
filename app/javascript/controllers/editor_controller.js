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
import { Table } from "@tiptap/extension-table"
import { TableRow } from "@tiptap/extension-table-row"
import { TableHeader } from "@tiptap/extension-table-header"
import { TableCell } from "@tiptap/extension-table-cell"

// --- Кастомная команда для вставки таблицы с атрибутами ---
// Эта функция-помощник создаёт таблицу с заданными опциями и атрибутами (например, CSS-классами).
const insertTableWithAttributes = (options, attributes = {}) => ({ tr, dispatch, editor }) => {
  const { schema } = editor.state;
  const { rows, cols, withHeaderRow } = options;

  const createCell = (cellType, cellAttrs) => {
    const cellContent = schema.nodes.paragraph.create();
    return schema.nodes[cellType].create(cellAttrs, cellContent);
  };

  const createRow = (cellType, cellAttrs) => {
    const cells = Array.from({ length: cols }, () => createCell(cellType, cellAttrs));
    return schema.nodes.tableRow.create(null, cells);
  };

  const tableRows = [];
  if (withHeaderRow) {
    tableRows.push(createRow('tableHeader', attributes.header));
  }

  const dataRowsCount = withHeaderRow ? rows - 1 : rows;
  for (let i = 0; i < dataRowsCount; i++) {
    tableRows.push(createRow('tableCell', attributes.cell));
  }

  const table = schema.nodes.table.create(attributes.table, tableRows);

  if (dispatch) {
    const offset = tr.selection.anchor + 1;
    tr.replaceSelectionWith(table)
      .setSelection(TextSelection.create(tr.doc, offset));
    dispatch(tr);
  }

  return true;
};

// --- 1. Extend TableCell to allow the 'style' attribute ---
const CustomTableCell = TableCell.extend({
  addAttributes() {
    return {
      // Keep the default attributes
      ...this.parent?.(),
      // Add 'style'
      style: {
        default: null,
      },
    };
  },
});

// --- 2. Extend TableHeader similarly ---
const CustomTableHeader = TableHeader.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      style: {
        default: null,
      },
    };
  },
});

// --- 3. Extend Table and add back `addAttributes` alongside `addCommands` ---
const CustomTable = Table.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      // Add back 'style' and 'class' for flexibility
      style: {
        default: null,
      },
      class: {
        default: null,
      }
    };
  },
  addCommands() {
    return {
      ...this.parent?.(),
      insertTableWithAttributes: insertTableWithAttributes,
    };
  },
});


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

        // Используем наше кастомное расширение для таблиц
        CustomTable.configure({ resizable: true }),
        TableRow, // TableRow itself doesn't need a style attribute
        CustomTableHeader,
        CustomTableCell,
      ],
      content: this.inputTarget.value,
      onUpdate: ({ editor }) => {
        // Проверяем все таблицы
        const tables = editor.view.dom.getElementsByTagName('table');
        Array.from(tables).forEach(table => {
          const cells = table.getElementsByTagName('td');
          const needsClass = Array.from(cells).some(td => !td.hasAttribute('style'));
          
          if (needsClass) {
            if (!table.classList.contains('custom-grid-table')) {
              table.classList.add('custom-grid-table');
            }
          } else {
            table.classList.remove('custom-grid-table');
          }
        });
        
        // Сохраняем HTML
        this.inputTarget.value = editor.getHTML()
      },
      onCreate: ({ editor }) => {
        // При инициализации проверяем все таблицы
        const tables = editor.view.dom.getElementsByTagName('table');
        Array.from(tables).forEach(table => {
          const cells = table.getElementsByTagName('td');
          const needsClass = Array.from(cells).some(td => !td.hasAttribute('style'));
          
          if (needsClass && !table.classList.contains('custom-grid-table')) {
            table.classList.add('custom-grid-table');
          }
        });
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

  // === Таблицы ===
  insertTableWithBorders() {
    this.editor.chain().focus().insertTableWithAttributes(
      { rows: 3, cols: 3, withHeaderRow: true }, // Параметры таблицы
      {
        // --- Атрибуты для каждого элемента ---
  
        // Стили для тега <table>
        table: {
          style: 'width: 100%; border-collapse: collapse; table-layout: fixed; margin: 1rem 0;',          
        },
        // Стили для ячеек-заголовков <th>
        header: {
          style: 'border: 1px solid red; padding: 0.5rem; font-weight: bold; text-align: left; background-color: #f1f3f5;',
        },
        // Стили для обычных ячеек <td>
        cell: {
          style: 'border: 1px solid #ccc; padding: 0.5rem; vertical-align: top; position: relative;',
        }
      }
    ).run();
  }

  insertTwoColumnTable() {
    this.editor.chain().focus().insertTableWithAttributes(
      { rows: 1, cols: 2, withHeaderRow: false },
      {
        table: {
          style: 'width: 100%; border-collapse: collapse; table-layout: fixed; margin: 1rem 0;',
          class: 'custom-table',
        }
      }
    ).run();
  
    // Получаем позицию курсора
    const { $from } = this.editor.state.selection;
  
    // Находим ближайшую родительскую таблицу из позиции курсора
    const tableNode = $from.node(-1); // -1 уровень выше, обычно это таблица
    const domTable = this.editor.view.nodeDOM($from.before(-1)); // получаем DOM таблицы
  
    if (domTable) {
      const tbody = domTable.querySelector('tbody');
      if (tbody) {
        const cells = tbody.getElementsByTagName('td');
        const needsClass = Array.from(cells).some(td => !td.hasAttribute('style'));
  
        if (needsClass && !tbody.classList.contains('table-custom-grid')) {
          tbody.classList.add('table-custom-grid');
        }
      }
    }
  }
  
  
  // Стандартные команды для управления таблицей
  addColumnBefore() { this.editor.chain().focus().addColumnBefore().run() }
  addColumnAfter() { this.editor.chain().focus().addColumnAfter().run() }
  deleteColumn() { this.editor.chain().focus().deleteColumn().run() }
  addRowBefore() { this.editor.chain().focus().addRowBefore().run() }
  addRowAfter() { this.editor.chain().focus().addRowAfter().run() }
  deleteRow() { this.editor.chain().focus().deleteRow().run() }
  deleteTable() { this.editor.chain().focus().deleteTable().run() }
  mergeOrSplit() { this.editor.chain().focus().mergeOrSplit().run() }
  toggleHeaderCell() { this.editor.chain().focus().toggleHeaderCell().run() }
  toggleHeaderRow() { this.editor.chain().focus().toggleHeaderRow().run() }
  toggleHeaderColumn() { this.editor.chain().focus().toggleHeaderColumn().run() }

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
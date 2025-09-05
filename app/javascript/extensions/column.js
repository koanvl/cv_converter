import { Node, mergeAttributes } from '@tiptap/core';

/**
 * Узел "Колонка".
 * Он не должен содержать никакой логики, связанной с его шириной.
 * Шириной управляет родительский узел ResizableColumns.
 */
export const Column = Node.create({
  name: 'column',
  content: 'block+',
  defining: true,

  parseHTML() {
    // Указываем, что парсить нужно div с классом 'col'
    return [{ tag: 'div.col' }];
  },

  renderHTML({ HTMLAttributes }) {
    // [ИСПРАВЛЕНО] УБРАН КЛАСС w-1/2, который мешал динамическому изменению ширины.
    // Остальные классы для стилизации рамки можно оставить.
    const attrs = mergeAttributes(HTMLAttributes, {
      class: 'col border border-gray-300 dashed w-1/2 p-2',
      'data-type': 'column',
      style: '',
    });
    // 0 — это место, куда Tiptap вставит дочерние элементы (параграфы и т.д.)
    return ['div', attrs, 0];
  },
});
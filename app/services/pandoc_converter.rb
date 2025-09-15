# frozen_string_literal: true

require "nokogiri"
require "open-uri"
require "tempfile"

class PandocConverter
  # html_content - строка с HTML
  # css_content - строка с CSS (опционально)
  def self.html_to_docx(html_content, css_content = nil)
    new(html_content, css_content).convert
  end

  def initialize(html_content, css_content = nil)
    @html = html_content
    @css = css_content
  end

  def convert
    # Парсим HTML
    doc = Nokogiri::HTML.fragment(@html)

    # Скачиваем все внешние изображения и заменяем src на локальный путь
    doc.css("img").each do |img|
      next if img["src"].blank? || img["src"].start_with?("file://")

      begin
        temp_file = Tempfile.new([ "img", File.extname(img["src"]) ])
        temp_file.binmode
        temp_file.write URI.open(img["src"]).read
        temp_file.flush
        img["src"] = temp_file.path
      rescue => e
        Rails.logger.warn "Failed to download image #{img['src']}: #{e.message}"
        img.remove
      end
    end

    # Собираем финальный HTML с CSS
    full_html = if @css.present?
                  "<html><head><style>#{@css}</style></head><body>#{doc.to_html}</body></html>"
    else
                  "<html><body>#{doc.to_html}</body></html>"
    end

    # Создаём временный HTML и DOCX
    Tempfile.create([ "resume", ".html" ]) do |f|
      f.write(full_html)
      f.flush

      Tempfile.create([ "resume", ".docx" ]) do |out|
        # Вызов Pandoc
        command = [
          "pandoc",
          f.path,
          "-f", "html",
          "-t", "docx",
          "-o", out.path,
          "--standalone"
        ]
        system(*command) or raise "Pandoc conversion failed"

        return File.binread(out.path)
      end
    end
  end
end

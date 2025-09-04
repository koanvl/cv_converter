# frozen_string_literal: true

class HtmlToDocxConverter
  FONT_SIZE_MAP = {
    10 => 20,   # 10px -> 20pt
    12 => 24,   # 12px -> 24pt
    14 => 28,   # 14px -> 28pt
    16 => 32,   # 16px -> 32pt
    18 => 36,   # 18px -> 36pt
    20 => 40,   # 20px -> 40pt
    24 => 48,   # 24px -> 48pt
    28 => 56,   # 28px -> 56pt
    32 => 64,   # 32px -> 64pt
    36 => 72    # 36px -> 72pt
  }.freeze

  def self.convert(html_content, css_content = nil)
    new(html_content, css_content).convert
  end

  def initialize(html_content, css_content)
    @html = Nokogiri::HTML.fragment(html_content)
    @css = css_content
  end

  def convert
    Caracal::Document.save "temp.docx" do |docx|
      # Set default document styles
      docx.style do
        id              "Normal"
        name            "Normal"
        font            "Arial"
        size            32  # Default size for 16px
        line            240
      end

      # Process content
      @html.children.each do |node|
        process_node(node, docx)
      end
    end

    content = File.binread("temp.docx")
    File.delete("temp.docx")
    content
  end

  private

  def process_node(node, docx)
    case node.name
    when "h1", "h2", "h3"
      style_options = extract_styles(node)
      text = node.text.strip
      case node.name
      when "h1"
        docx.h1 text, style_options.merge(size: 48)  # 24px
      when "h2"
        docx.h2 text, style_options.merge(size: 40)  # 20px
      when "h3"
        docx.h3 text, style_options.merge(size: 32)  # 16px
      end
    when "p"
      if node.text.strip.present?
        style_options = extract_styles(node)
        docx.p node.text.strip, style_options
      else
        docx.p
      end
    when "img"
      if node["src"]&.start_with?("/")
        image_path = Rails.root.join("public", node["src"].sub(/^\//, ""))
        if File.exist?(image_path)
          style_options = extract_styles(node)
          docx.img image_path do
            width   500
            height  350
            align   style_options[:align] || :center
          end
          docx.p # Add space after image
        end
      end
    when "ol", "ul"
      items = node.css("li").map do |li|
        [ li.text.strip, extract_styles(li) ]
      end

      if node.name == "ol"
        docx.ol do
          items.each do |text, style_options|
            li text, style_options.merge(size: 28) unless text.blank? # 16px
          end
        end
      else
        docx.ul do
          items.each do |text, style_options|
            li text, style_options.merge(size: 28) unless text.blank? # 16px
          end
        end
      end
    end
  end

  def extract_styles(node)
    styles = {}

    if node["style"]
      style_string = node["style"]

      # Font size
      if style_string =~ /font-size:\s*(\d+)px/
        px_size = $1.to_i
        styles[:size] = map_font_size(px_size)
      end

      # Font weight
      if style_string =~ /font-weight:\s*(bold|700|800|900)/
        styles[:bold] = true
      end

      # Font style
      if style_string =~ /font-style:\s*italic/
        styles[:italic] = true
      end

      # Text decoration
      if style_string =~ /text-decoration:\s*underline/
        styles[:underline] = true
      end
      if style_string =~ /text-decoration:\s*line-through/
        styles[:strike] = true
      end

      # Text alignment
      if style_string =~ /text-align:\s*(left|center|right|justify)/
        styles[:align] = $1.to_sym
      end

      # Text color
      if style_string =~ /color:\s*#([0-9a-fA-F]{6})/
        styles[:color] = $1
      elsif style_string =~ /color:\s*rgb\((\d+),\s*(\d+),\s*(\d+)\)/
        styles[:color] = sprintf("%02x%02x%02x", $1.to_i, $2.to_i, $3.to_i)
      end
    end

    # Check for nested styles
    node.css("strong, b").each { styles[:bold] = true }
    node.css("em, i").each { styles[:italic] = true }
    node.css("u").each { styles[:underline] = true }
    node.css("strike, s").each { styles[:strike] = true }

    styles
  end

  def map_font_size(px_size)
    # Find the closest size in our map
    FONT_SIZE_MAP.min_by { |px, _pt| (px - px_size).abs }[1]
  end

  def convert_color(color)
    case color
    when /^#([0-9a-fA-F]{6})$/
      $1
    when /^#([0-9a-fA-F]{3})$/
      "#{$1[0]}#{$1[0]}#{$1[1]}#{$1[1]}#{$1[2]}#{$1[2]}"
    when /^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/
      sprintf("%02x%02x%02x", $1.to_i, $2.to_i, $3.to_i)
    else
      color
    end
  end
end

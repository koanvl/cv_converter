# frozen_string_literal: true

class HtmlToDocxConverter
  FONT_SIZE_MAP = {
    11 => 11,   # 11px -> 11pt
    12 => 12,   # 12px -> 12pt
    13 => 13,   # 13px -> 13pt
    15 => 15,   # 15px -> 15pt
    16 => 16,   # 16px -> 16pt
    19 => 19,   # 19px -> 19pt
    21 => 21,   # 21px -> 21pt
    24 => 24,   # 24px -> 24pt
    27 => 27,   # 27px -> 27pt
    32 => 32    # 32px -> 32pt
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
      # Set default styles
      docx.style do
        id           "Normal"
        name         "Normal"
        font         "Arial"
        size         24  # Default size for 12px
        line         240
        color        "000000"
      end

      # Set heading styles with minimal defaults - actual sizes will be set per-paragraph
      docx.style do
        id           "Heading1"
        name         "heading 1"
        font         "Arial"
        bold         true
        line         360
      end

      docx.style do
        id           "Heading2"
        name         "heading 2"
        font         "Arial"
        bold         true
        line         320
      end

      docx.style do
        id           "Heading3"
        name         "heading 3"
        font         "Arial"
        bold         true
        line         280
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
      # Extract font size from the first span if present
      first_span = node.at_css('span[style*="font-size"]')
      font_size = if first_span && first_span["style"] =~ /font-size:\s*(\d+)px/
        $1.to_i
      else
        case node.name
        when "h1" then 24  # Default h1 size
        when "h2" then 20  # Default h2 size
        when "h3" then 16  # Default h3 size
        end
      end

      # Convert px to pt
      pt_size = map_font_size(font_size)
      case node.name
      when "h1"
        process_styled_paragraph(docx, :h1, node, size: pt_size)
      when "h2"
        process_styled_paragraph(docx, :h2, node, size: pt_size)
      when "h3"
        process_styled_paragraph(docx, :h3, node, size: pt_size)
      end
    when "p"
      if node.text.strip.present?
        process_styled_paragraph(docx, :p, node)
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
    when "table"
      process_table(node, docx)
    when "div"
      # Check if this div should be converted to a table
      if should_convert_to_table?(node)
        # NEW: Extract border color or use default
        border_color = extract_border_color(node) || "666666"

        # Check if we can combine with next similar divs
        similar_divs = collect_similar_flex_divs(node)
        if similar_divs.any?
          # MODIFIED: Pass border_color to the method
          convert_multiple_divs_to_table(similar_divs, docx, border_color: border_color)
        else
          # MODIFIED: Pass border_color to the method
          convert_div_to_table(node, docx, border_color: border_color)
        end
      else
        # Process div content normally
        node.children.each { |child| process_node(child, docx) }
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

    # Process style attribute
    process_style_attribute(node["style"], styles) if node["style"]

    # Process nested spans with styles
    node.css("span[style]").each do |span|
      process_style_attribute(span["style"], styles)
    end

    # Check for nested styles
    node.css("strong, b").each { styles[:bold] = true }
    node.css("em, i").each { styles[:italic] = true }
    node.css("u").each { styles[:underline] = true }
    node.css("strike, s").each { styles[:strike] = true }

    styles
  end

  def process_style_attribute(style_string, styles)
    return unless style_string

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
      r, g, b = $1.to_i, $2.to_i, $3.to_i
      styles[:color] = sprintf("%02x%02x%02x", r, g, b)
    end
  end

  def map_font_size(px_size)
    # Convert px to pt directly (1px = 0.75pt)
    ((px_size * 0.75)*2).round
  end

  def process_styled_paragraph(docx, type, node, base_styles = {})
    # Collect all text parts with their styles
    parts = collect_text_parts(node, base_styles)

    # Create paragraph and add styled text parts
    case type
    when :h1
      docx.h1 do |p|
        parts.each do |text, styles|
          p.text(text, styles.except(:size)) unless text.empty?
        end
      end
    when :h2
      docx.h2 do |p|
        parts.each do |text, styles|
          p.text(text, styles.except(:size)) unless text.empty?
        end
      end
    when :h3
      docx.h3 do |p|
        parts.each do |text, styles|
          p.text(text, styles.except(:size)) unless text.empty?
        end
      end
    else
      docx.p do |p|
        parts.each do |text, styles|
          p.text(text, styles) unless text.empty?
        end
      end
    end
  end

  def collect_text_parts(node, base_styles = {})
    parts = []

    node.children.each do |child|
      if child.text?
        # If it's a pure text node, use parent styles
        text = child.text.strip
        parts << [ text, base_styles ] unless text.empty?
      elsif child.element?
        # For elements, combine their styles with parent styles
        child_styles = base_styles.merge(extract_styles(child))

        if child.children.empty?
          # If it's a leaf node, add its text with combined styles
          text = child.text.strip
          parts << [ text, child_styles ] unless text.empty?
        else
          # If it has children, process them recursively
          parts.concat(collect_text_parts(child, child_styles))
        end
      end
    end

    parts
  end

  # MODIFIED HELPER
  def convert_color(color)
    case color
    when /^#([0-9a-fA-F]{6})$/
      $1 # Return 6-digit hex
    when /^#([0-9a-fA-F]{3})$/
      $1.chars.map { |c| c * 2 }.join # Convert 3-digit to 6-digit
    when /^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/
      sprintf("%02x%02x%02x", $1.to_i, $2.to_i, $3.to_i) # Convert RGB to hex
    else
      nil # Return nil if format is unknown
    end
  end

  # NEW HELPER
  def extract_border_color(node)
    # Find the first child element with 'border' in its style
    element_with_border = node.at_css('[style*="border"]')
    style_string = element_with_border&.[]("style")
    return nil unless style_string

    # Extract the color value (rgb or hex)
    match = style_string.match(/(?:border|border-color):\s*.*?((?:rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)|#[0-9a-fA-F]{3,6}))/i)
    return nil unless match

    convert_color(match[1])
  end

  def should_convert_to_table?(node)
    # Check if the div has a grid layout, flex layout, or table-like structure
    style = node["style"].to_s
    return true if style =~ /display:\s*grid/
    return true if style =~ /display:\s*table/
    return true if style =~ /display:\s*flex/
    return true if node["class"]&.include?("flex")
    return true if node.css("> div").count >= 2 && node.css("> div").all? { |div| similar_structure?(div) }
    false
  end

  def similar_structure?(node)
    # Check if nodes have similar structure (like grid items)
    return true if node["class"]&.include?("grid-")
    return true if node["style"]&.match?(/grid-|flex-/)
    false
  end

  def process_table(node, docx)
    rows = node.css("tr")
    return if rows.empty?

    docx.table rows do
      rows.each do |tr|
        cells = tr.css("td, th")
        row_data = cells.map do |cell|
          style_options = extract_styles(cell)
          [ cell.text.strip, style_options ]
        end

        cell_style = {}
        cell_style[:background] = "CCCCCC" if tr.css("th").any? # Header row style

        cells row_data do
          style cell_style
        end
      end
    end
    docx.p # Add space after table
  end

  # MODIFIED METHOD
  def convert_div_to_table(node, docx, border_color: "666666")
    # Convert grid/flex layout to table structure
    items = node.css("> div")
    return if items.empty?

    # Determine table structure based on layout type
    if is_flex_container?(node)
      convert_flex_to_table(node, items, docx, border_color: border_color)
    else
      convert_grid_to_table(node, items, docx, border_color: border_color)
    end

    docx.p # Add space after table
  end

  # MODIFIED METHOD
  def convert_flex_to_table(node, items, docx, border_color: "666666")
    # Determine if flex is row or column oriented
    style = node["style"].to_s
    flex_direction = style =~ /flex-direction:\s*column/ ? :column : :row

    if flex_direction == :row
      # For row direction, each flex item becomes a column
      # Prepare data before creating table
      row_data = items.map { |item| item.text.strip }

      docx.table [ row_data ] do
        border_color   border_color
        border_line    :single
        border_size    4
        border_spacing 0
      end
    else
      # For column direction, each flex item becomes a row
      # Prepare data before creating table
      rows_data = items.map { |item| [ item.text.strip ] }

      docx.table rows_data do
        border_color   border_color
        border_line    :single
        border_size    4
        border_spacing 0
      end
    end
  end

  # MODIFIED METHOD
  def convert_grid_to_table(node, items, docx, border_color: "666666")
    # Determine table structure (2 columns by default)
    cols = 2
    if node["style"]&.match?(/grid-cols-(\d+)/)
      cols = $1.to_i
    end

    # Group items into rows and prepare data
    rows_data = items.each_slice(cols).map do |row_items|
      row_items.map { |item| item.text.strip }
    end

    docx.table rows_data do
      border_color   border_color
      border_line    :single
      border_size    4
      border_spacing 0
    end
  end

  def is_flex_container?(node)
    style = node["style"].to_s
    return true if style =~ /display:\s*flex/
    return true if node["class"]&.include?("flex")
    false
  end

  def collect_similar_flex_divs(node)
    return [] unless is_flex_container?(node)

    # Get the structure signature of the current div
    current_structure = get_flex_structure(node)
    return [] unless current_structure

    similar_divs = [ node ]
    next_node = node.next_sibling

    while next_node
      # Skip text nodes and comments
      if next_node.text? || next_node.comment?
        next_node = next_node.next_sibling
        next
      end

      # Check if the next node has the same structure
      if is_flex_container?(next_node) && get_flex_structure(next_node) == current_structure
        similar_divs << next_node
        next_node.unlink # Remove from DOM to prevent double processing
      else
        break
      end

      next_node = next_node.next_sibling
    end

    similar_divs
  end

  def get_flex_structure(node)
    return nil unless is_flex_container?(node)

    # Find the flex container with the actual columns
    flex_container = node.css(".flex-grow").first || node

    # Get all direct column divs
    columns = flex_container.css('> div[data-type="column"]')
    return nil if columns.empty?

    # Return the number of columns and their classes
    columns.map { |col| col["class"] }.join("|")
  end

  # MODIFIED METHOD
  def convert_multiple_divs_to_table(divs, docx, border_color: "666666")
    # Extract data from each div
    rows_data = divs.map do |div|
      # Find the flex container with the actual columns
      flex_container = div.css(".flex-grow").first || div

      # Get text from each column
      columns = flex_container.css('div[data-type="column"]')
      columns.map { |col| col.text.strip }
    end

    # Create a single table with all rows
    docx.table rows_data do
      border_color   border_color
      border_line    :single
      border_size    4
      border_spacing 0
    end
  end
end

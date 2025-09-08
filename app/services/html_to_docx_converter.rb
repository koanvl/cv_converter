# frozen_string_literal: true

class HtmlToDocxConverter
  FONT_SIZE_MAP = {
    11 => 8,   # 11px -> 8pt
    12 => 9,   # 12px -> 9pt
    13 => 10,   # 13px -> 10pt
    15 => 11,   # 15px -> 11pt
    16 => 12,   # 16px -> 12pt
    19 => 14,   # 19px -> 14pt
    21 => 16,   # 21px -> 16pt
    24 => 18,   # 24px -> 18pt
    27 => 20,   # 27px -> 20pt
    32 => 24    # 32px -> 24pt
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
    when "table"
      process_table(node, docx)
    when "div"
      # Check if this div should be converted to a table
      if should_convert_to_table?(node)
        # Check if we can combine with next similar divs
        similar_divs = collect_similar_flex_divs(node)
        if similar_divs.any?
          convert_multiple_divs_to_table(similar_divs, docx)
        else
          convert_div_to_table(node, docx)
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

  def convert_div_to_table(node, docx)
    # Convert grid/flex layout to table structure
    items = node.css("> div")
    return if items.empty?

    # Determine table structure based on layout type
    if is_flex_container?(node)
      convert_flex_to_table(node, items, docx)
    else
      convert_grid_to_table(node, items, docx)
    end

    docx.p # Add space after table
  end

  def convert_flex_to_table(node, items, docx)
    # Determine if flex is row or column oriented
    style = node["style"].to_s
    flex_direction = style =~ /flex-direction:\s*column/ ? :column : :row

    if flex_direction == :row
      # For row direction, each flex item becomes a column
      # Prepare data before creating table
      row_data = items.map { |item| item.text.strip }

      docx.table [ row_data ] do
        border_color   "666666"
        border_line    :single
        border_size    4
        border_spacing 0
      end
    else
      # For column direction, each flex item becomes a row
      # Prepare data before creating table
      rows_data = items.map { |item| [ item.text.strip ] }

      docx.table rows_data do
        border_color   "666666"
        border_line    :single
        border_size    4
        border_spacing 0
      end
    end
  end

  def convert_grid_to_table(node, items, docx)
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
      border_color   "666666"
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

  def convert_multiple_divs_to_table(divs, docx)
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
      border_color   "666666"
      border_line    :single
      border_size    4
      border_spacing 0
    end
  end
end

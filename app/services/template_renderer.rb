# frozen_string_literal: true

class TemplateRenderer
  def initialize(template_html, candidate_data)
    @template_html = template_html
    @candidate_data = candidate_data
  end

  def render
    rendered_html = @template_html.dup

    # First process {{#each array}}...{{/each}} loops
    rendered_html = process_each_loops(rendered_html)

    # Then replace regular variables in {{key}} format
    rendered_html.gsub!(/\{\{([^}]+)\}\}/) do |match|
      variable_path = $1.strip
      get_nested_value(@candidate_data, variable_path) || match
    end

    rendered_html
  end

  private

  def process_each_loops(html)
    # Process loops in format {{#each array_name}}...{{/each}}
    html.gsub(/\{\{#each\s+([^}]+)\}\}(.*?)\{\{\/each\}\}/m) do |match|
      array_path = $1.strip
      loop_content = $2

      # Get array data
      array_data = get_nested_value(@candidate_data, array_path)

      if array_data.is_a?(Array)
        # For each array element, render loop content
        array_data.map.with_index do |item, index|
          item_html = loop_content.dup

          # Replace variables inside the loop
          # Support both {{title}} and {{this.title}}
          item_html.gsub!(/\{\{(this\.)?([^}]+)\}\}/) do |var_match|
            var_name = $2.strip

            if item.is_a?(Hash)
              item[var_name] || var_match
            else
              var_match
            end
          end

          # Also support {{@index}} for array indices
          item_html.gsub!(/\{\{@index\}\}/, index.to_s)

          item_html
        end.join("")
      else
        # If not an array, return empty string
        ""
      end
    end
  end

  def get_nested_value(data, path)
    return nil unless data.is_a?(Hash)

    # Parse path like "projects[0].title" or "name"
    keys = parse_path(path)

    current = data
    keys.each do |key|
      if key.is_a?(Integer)
        # Handle array index
        return nil unless current.is_a?(Array) && current[key]
        current = current[key]
      else
        # Handle object key
        return nil unless current.is_a?(Hash) && current.key?(key)
        current = current[key]
      end
    end

    current
  end

  def parse_path(path)
    keys = []

    # Split path into parts, considering arrays
    parts = path.split(".")

    parts.each do |part|
      if part.include?("[")
        # Handle cases like "projects[0]"
        key_name = part.split("[").first
        index_match = part.match(/\[(\d+)\]/)

        keys << key_name
        keys << index_match[1].to_i if index_match
      else
        keys << part
      end
    end

    keys
  end
end

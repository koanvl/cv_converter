class CvGeneration < ApplicationRecord
  belongs_to :example
  belongs_to :cv_candidate

  validates :generated_html, presence: true

  # Метод для получения полного HTML с CSS
  def full_html
    html_content = generated_html
    css_content = generated_css.present? ? generated_css : example.css

    <<~HTML
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            #{css_content}
          </style>
        </head>
        <body>
          #{html_content}
        </body>
      </html>
    HTML
  end
end

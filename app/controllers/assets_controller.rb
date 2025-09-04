# frozen_string_literal: true

class AssetsController < ApplicationController
  skip_before_action :verify_authenticity_token, only: [ :upload ]
  before_action :set_cors_headers

  def upload
    if request.method == "OPTIONS"
      head :ok
    else
      handle_upload
    end
  end

  private

  def handle_upload
    unless params[:file]
      render json: { error: "No file provided" }, status: :unprocessable_entity
      return
    end

    uploaded_file = params[:file]

    # Check file type
    unless uploaded_file.content_type.start_with?("image/")
      render json: { error: "Invalid file type. Only images are allowed." }, status: :unprocessable_entity
      return
    end

    begin
      filename = SecureRandom.hex + File.extname(uploaded_file.original_filename)
      filepath = Rails.root.join("public", "uploads", filename)

      # Create directory if it doesn't exist
      FileUtils.mkdir_p(Rails.root.join("public", "uploads"))

      # Save the file
      File.open(filepath, "wb") do |file|
        file.write(uploaded_file.read)
      end

      # Return file URL
      render json: { url: "/uploads/#{filename}" }
    rescue => e
      Rails.logger.error "File upload error: #{e.message}"
      render json: { error: "Error saving file" }, status: :internal_server_error
    end
  end

  def set_cors_headers
    headers["Access-Control-Allow-Origin"] = request.headers["Origin"] || "*"
    headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
    headers["Access-Control-Allow-Headers"] = "Content-Type, X-CSRF-Token"
    headers["Access-Control-Max-Age"] = "86400"
  end
end

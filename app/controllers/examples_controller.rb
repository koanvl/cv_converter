# frozen_string_literal: true

class ExamplesController < ApplicationController
  before_action :set_example, only: [ :show, :edit, :update, :destroy ]

  def index
    @examples = Example.order(created_at: :desc)
  end

  def show
  end

  def new
    @example = Example.new
  end

  def edit
  end

  def create
    @example = Example.new(example_params)

    if @example.save
      redirect_to @example, notice: "Example was successfully created."
    else
      render :new, status: :unprocessable_entity
    end
  end

  def update
    if @example.update(example_params)
      respond_to do |format|
        format.html { redirect_to @example, notice: "Example was successfully updated." }
        format.json { render json: @example }
      end
    else
      respond_to do |format|
        format.html { render :edit, status: :unprocessable_entity }
        format.json { render json: @example.errors, status: :unprocessable_entity }
      end
    end
  end

  def destroy
    @example.destroy
    redirect_to examples_url, notice: "Example was successfully deleted."
  end

  def download
    @example = Example.find(params[:id])

    respond_to do |format|
      format.docx {
        begin
          Rails.logger.debug "Converting HTML to DOCX"
          Rails.logger.debug "Content: #{@example.content}"

          # Convert HTML to DOCX
          file_content = HtmlToDocxConverter.convert(@example.content, @example.css)

          send_data file_content,
                    filename: "#{@example.title}.docx",
                    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                    disposition: "attachment"
        rescue => e
          Rails.logger.error "Error converting to DOCX: #{e.message}"
          Rails.logger.error e.backtrace.join("\n")
          redirect_to @example, alert: "Error generating DOCX file: #{e.message}"
        end
      }
    end
  end

  private

  def set_example
    @example = Example.find(params[:id])
  end

  def example_params
    params.require(:example).permit(:title, :content, :format, :published, :css)
  end
end

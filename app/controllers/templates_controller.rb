# frozen_string_literal: true

class TemplatesController < ApplicationController
  before_action :set_template, only: [ :show, :edit, :update, :destroy ]

  def index
    @templates = Template.all
  end

  def show
  end

  def new
    @template = Template.new
  end

  def create
    @template = Template.new(template_params)
    @template.data = {} # Пустой JSON для GrapesJS
    if @template.save
      # После успешного создания — редиректим на edit
      redirect_to edit_template_path(@template), notice: "Template was successfully created."
    else
      render :new, status: :unprocessable_entity
    end
  end

  def edit; end

  def update
    # Обработка данных из GrapesJS
    template_data = params[:template][:data]

    # Конвертируем в JSON если нужно
    if template_data.is_a?(Hash) || template_data.is_a?(ActionController::Parameters)
      template_data_json = template_data.to_json
    else
      template_data_json = template_data
    end

    # Извлекаем HTML и CSS для отдельного хранения
    html_content = ""
    css_content = ""

    if template_data.is_a?(Hash) || template_data.is_a?(ActionController::Parameters)
      # Способ 1: Если данные из альтернативного сохранения
      if template_data[:gjs_html] && template_data[:gjs_css]
        html_content = template_data[:gjs_html]
        css_content = template_data[:gjs_css]
      # Способ 2: Если данные из обычного store()
      elsif template_data[:pages]&.any?
        pages = template_data[:pages]
        if pages[0] && pages[0][:frames]&.any?
          frame = pages[0][:frames][0]
          html_content = frame[:component] || ""
        end
        css_content = template_data[:assets] || ""
      end
    end

    # Сохраняем все форматы для максимальной совместимости
    update_params = {
      data: template_data_json,
      html: html_content,
      css: css_content
    }

    if @template.update(update_params)
      head :ok
    else
      render json: @template.errors, status: :unprocessable_entity
    end
  end

  def destroy
    @template.destroy
    redirect_to templates_path, notice: "Template was successfully deleted."
  end

  private

  def set_template
    @template = Template.find(params[:id])
  end

  def template_params
    params.require(:template).permit(:title, :data, :html, :css)
  end
end

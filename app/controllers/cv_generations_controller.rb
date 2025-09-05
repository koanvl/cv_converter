# frozen_string_literal: true

class CvGenerationsController < ApplicationController
  before_action :set_cv_generation, only: [ :show, :edit, :update, :edit_content ]

  def show
    # Показать сгенерированное резюме в полном размере
  end

  def edit
    # Показать форму редактирования метаданных
  end

  def edit_content
    # Показать редактор содержимого резюме
  end

  def update
    if params[:cv_generation][:generated_html]
      # Обновляем содержимое резюме
      if @cv_generation.update(cv_generation_params)
        redirect_to cv_generator_path(@cv_generation.cv_candidate),
                    notice: "Резюме успешно обновлено!"
      else
        render :edit_content, status: :unprocessable_entity
      end
    else
      # Обновляем метаданные
      if @cv_generation.update(cv_generation_params)
        redirect_to cv_generator_path(@cv_generation.cv_candidate),
                    notice: "Данные резюме обновлены!"
      else
        render :edit, status: :unprocessable_entity
      end
    end
  end

  private

  def set_cv_generation
    @cv_generation = CvGeneration.find(params[:id])
  end

  def cv_generation_params
    params.require(:cv_generation).permit(:generated_html, :generated_css)
  end
end

using GenomiX.Core.Interfaces;
using GenomiX.Core.Models;
using GenomiX.ViewModels.Disease;

namespace GenomiX.Core.Services
{
    /// <summary>
    /// Provides AI-generated explanations for potential genetic disease markers based on input data.
    /// </summary>
    public class AiDiseaseExplanationService : IAiDiseaseExplanationService
    {
        /// <summary>
        /// Generates an educational explanation for a potential genetic disease marker based on the provided analysis
        /// input.
        /// </summary>
        public Task<DiseaseAiExplanationDto> ExplainAsync(DiseaseAiExplanationRequestDto input)
        {
            var confidencePercent = Math.Round(input.Confidence * 100.0, 0);

            var result = new DiseaseAiExplanationDto
            {
                Title = $"Potential marker detected: {input.DiseaseName}",

                Summary = $"A possible genetic marker associated with {input.DiseaseName} was detected in gene {input.GeneName}. Confidence: {confidencePercent}%.",

                BiologyExplanation = $"{input.DiseaseName} is associated with changes in the {input.GeneName} gene. This result means the current DNA model matches stored mutation patterns.",

                LifestyleConsiderations = new List<string>
            {
                "Maintain healthy habits and avoid conclusions based only on simulation.",
                "Discuss lifestyle concerns with a qualified professional.",
                "Use this as educational insight, not medical advice."
            },

                MedicationConsiderations = new List<string>
            {
                "Do not change medication based on this result.",
                "Some genetic conditions affect drug response, but require clinical testing.",
                "Consult a medical professional for real decisions."
            },

                Warning = "This is an educational result and not a medical diagnosis."
            };

            return Task.FromResult(result);
        }
    }
}

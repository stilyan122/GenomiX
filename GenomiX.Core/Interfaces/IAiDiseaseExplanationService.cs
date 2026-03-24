using GenomiX.Core.Models;
using GenomiX.ViewModels.Disease;

namespace GenomiX.Core.Interfaces
{
    /// <summary>
    /// Defines a service for generating AI-based explanations of disease scan results.
    /// </summary>
    public interface IAiDiseaseExplanationService
    {
        /// <summary>
        /// Generates an explanation for the AI-based disease prediction based on the provided input data.
        /// </summary>
        Task<DiseaseAiExplanationDto> ExplainAsync(DiseaseAiExplanationRequestDto input);
    }
}

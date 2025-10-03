namespace GenomiX.Infrastructure.Constants
{
    /// <summary>
    /// Provides property constraint constants for the Question entity.
    /// </summary>
    public static class QuestionPropertyConstraints
    {
        /// <summary>
        /// The maximum length allowed for the Prompt property.
        /// </summary>
        public const int Prompt_MaxLength = 512;

        /// <summary>
        /// The maximum length allowed for the Explanation property.
        /// </summary>
        public const int Explanation_MaxLength = 1024;

        /// <summary>
        /// The maximum length allowed for the Type property (e.g., "mcq", "multi", "open").
        /// </summary>
        public const int Type_MaxLength = 32;
    }
}
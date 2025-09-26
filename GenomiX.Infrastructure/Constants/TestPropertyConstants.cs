namespace GenomiX.Infrastructure.Constants
{
    /// <summary>
    /// Provides property constraint constants for the Test entity.
    /// </summary>
    public static class TestPropertyConstraints
    {
        /// <summary>
        /// The maximum length allowed for the Type property (e.g., "mcq", "multi", "open").
        /// </summary>
        public const int Type_MaxLength = 32;

        /// <summary>
        /// The maximum length allowed for the Question property (question text/prompt).
        /// </summary>
        public const int Question_MaxLength = 512;
    }
}
namespace GenomiX.Infrastructure.Constants
{
    /// <summary>
    /// Provides property constraint constants for the Lesson entity.
    /// </summary>
    public static class LessonPropertyConstraints
    {
        /// <summary>
        /// The maximum length allowed for the Title property.
        /// </summary>
        public const int Title_MaxLength = 200;

        /// <summary>
        /// The maximum length allowed for the Topic property.
        /// </summary>
        public const int Topic_MaxLength = 100;

        /// <summary>
        /// The maximum length allowed for the Information property (Markdown/HTML/plain content).
        /// </summary>
        public const int Information_MaxLength = 8000;

        /// <summary>
        /// The minimum allowed value for Difficulty.
        /// </summary>
        public const byte Difficulty_Min = 1;

        /// <summary>
        /// The maximum allowed value for Difficulty.
        /// </summary>
        public const byte Difficulty_Max = 5;
    }
}
namespace GenomiX.Infrastructure.Constants
{
    /// <summary>
    /// Provides property constraint constants for the DNASequence entity.
    /// </summary>
    public static class DNASequencePropertyConstraints
    {
        /// <summary>
        /// The maximum length allowed for the Sequence property (raw DNA string).
        /// </summary>
        public const int Sequence_MaxLength = 10000;

        /// <summary>
        /// The minimum length allowed for the Strand property.
        /// </summary>
        public const int Strand_MinLength = 1;

        /// <summary>
        /// The maximum length allowed for the Strand property.
        /// </summary>
        public const int Strand_MaxLength = 2;

        /// <summary>
        /// The allowed characters for the Sequence property (uppercase A, C, G, T only).
        /// </summary>
        public const string Sequence_AllowedCharacters = "ACGT";
    }
}   
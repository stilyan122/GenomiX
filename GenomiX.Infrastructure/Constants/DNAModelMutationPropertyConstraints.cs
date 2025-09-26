namespace GenomiX.Infrastructure.Constants
{
    /// <summary>
    /// Provides property constraint constants for the DNAModelMutation entity.
    /// </summary>
    public static class DNAModelMutationPropertyConstraints
    {
        /// <summary>
        /// The maximum length allowed for the Type property (e.g., "substitution", "insertion", "deletion").
        /// </summary>
        public const int Type_MaxLength = 32;

        /// <summary>
        /// The maximum length allowed for the Ref property (reference bases).
        /// </summary>
        public const int Ref_MaxLength = 128;

        /// <summary>
        /// The maximum length allowed for the Alt property (alternate bases).
        /// </summary>
        public const int Alt_MaxLength = 128;

        /// <summary>
        /// The minimum allowed value for PosStart (1-based index).
        /// </summary>
        public const int PosStart_Min = 1;

        /// <summary>
        /// The minimum allowed value for PosEnd (should be >= PosStart).
        /// </summary>
        public const int PosEnd_Min = 1;
    }
}
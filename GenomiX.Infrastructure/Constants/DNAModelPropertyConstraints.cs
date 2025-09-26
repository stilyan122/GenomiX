namespace GenomiX.Infrastructure.Constants
{
    /// <summary>
    /// Provides property constraint constants for the DNAModel entity.
    /// </summary>
    public static class DNAModelPropertyConstraints
    {
        /// <summary>
        /// The minimum allowed value for CurrentIndex (zero-based).
        /// </summary>
        public const int CurrentIndex_Min = 0;

        /// <summary>
        /// The minimum allowed value for DisplayMode (0 = Basic shapes).
        /// </summary>
        public const byte DisplayMode_Min = 0;

        /// <summary>
        /// The maximum allowed value for DisplayMode (1 = Scientific atomic view).
        /// </summary>
        public const byte DisplayMode_Max = 1;
    }
}
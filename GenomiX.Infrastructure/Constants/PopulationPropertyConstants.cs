namespace GenomiX.Infrastructure.Constants
{
    /// <summary>
    /// Provides property constraint constants for the Population entity.
    /// </summary>
    public static class PopulationPropertyConstraints
    {
        /// <summary>
        /// The maximum length allowed for the Name property (human-friendly name for the run).
        /// </summary>
        public const int Name_MaxLength = 200;

        /// <summary>
        /// The maximum length allowed for the Factors property (JSON with simulation factors).
        /// </summary>
        public const int Factors_MaxLength = 4000;
    }
}
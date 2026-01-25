namespace GenomiX.Infrastructure.Constants
{
    /// <summary>
    /// Provides property constraint constants for the Organism entity.
    /// </summary>
    public static class OrganismPropertyConstraints
    {
        /// <summary>
        /// The maximum length allowed for the SimpleName property.
        /// </summary>
        public const int SimpleName_MaxLength = 100;

        /// <summary>
        /// The maximum length allowed for the ScientificName property.
        /// </summary>
        public const int ScientificName_MaxLength = 150;

        /// <summary>
        /// The maximum length allowed for the Description property.
        /// </summary>
        public const int Description_MaxLength = 500;

        /// <summary>
        /// The maximum length allowed for the Status property (e.g., "alive", "dead", "reproduced").
        /// </summary>
        public const int Status_MaxLength = 32;

        /// <summary>
        /// The maximum length allowed for the Type property.
        /// </summary>
        public const int Type_MaxLength = 50;
    }
}
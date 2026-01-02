namespace GenomiX.Infrastructure.Constants
{
    /// <summary>
    /// Provides property constraint constants for the RoleRequet entity.
    /// </summary>
    public static class RoleRequestPropertyConstraints
    {
        /// <summary>
        /// The maximum length allowed for the RequestedRole property.
        /// </summary>
        public const int RequestedRole_MaxLength = 32;

        /// <summary>
        /// The maximum length allowed for the Status property.
        /// </summary>
        public const int Status_MaxLength = 16;

        /// <summary>
        /// The maximum length allowed for the RequestType property.
        /// </summary>
        public const int Type_MaxLength = 16;

        /// <summary>
        /// The maximum length allowed for the Note property.
        /// </summary>
        public const int Note_MaxLength = 500;
    }
}

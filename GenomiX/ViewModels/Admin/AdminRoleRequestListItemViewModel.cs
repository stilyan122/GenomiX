namespace GenomiX.ViewModels.Admin
{
    public class AdminRoleRequestListItemViewModel
    {
        public int Id { get; set; }

        public Guid UserId { get; set; }
        public string UserName { get; set; } = "";
        public string Email { get; set; } = "";

        public string RequestType { get; set; } = "";
        public string RequestedRole { get; set; } = "";
        public string Status { get; set; } = "";

        public string? Note { get; set; }

        public DateTime CreatedAt { get; set; }
        public DateTime? DecidedAt { get; set; }
    }
}

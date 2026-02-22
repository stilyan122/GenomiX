namespace GenomiX.ViewModels.Admin
{
    public class AdminUserListItemViewModel
    {
        public Guid UserId { get; set; }
        public string UserName { get; set; } = "";
        public string Email { get; set; } = "";

        public List<string> Roles { get; set; } = new();

        public int DnaModels { get; set; }
        public int Simulations { get; set; }

        public DateTimeOffset? RegisteredAt { get; set; }
    }
}

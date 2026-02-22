namespace GenomiX.Core.Models
{
    public class AdminUserRow
    {
        public Guid UserId { get; set; }
        public string UserName { get; set; } = "";
        public string Email { get; set; } = "";
        public IReadOnlyList<string> Roles { get; set; } = Array.Empty<string>();

        public int DnaModels { get; set; }
        public int Simulations { get; set; }
    }
}

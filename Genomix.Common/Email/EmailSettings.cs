namespace Genomix.Common.Email
{
    public class EmailSettings
    {
        public string FromName { get; set; } = "GenomiX";
        public string FromEmail { get; set; } = "";
        public string Host { get; set; } = "";
        public int Port { get; set; } = 587;
        public bool UseSsl { get; set; } = false;
        public bool UseStartTls { get; set; } = true;
        public string Username { get; set; } = "";
        public string Password { get; set; } = "";
    }
}

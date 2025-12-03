namespace Genomix.Common.Email
{
    public class EmailSettings
    {
        public string FromName { get; set; } = null!;
        public string FromAddress { get; set; } = null!;

        public string Host { get; set; } = null!;
        public int Port { get; set; }

        public string User { get; set; } = null!;
        public string Password { get; set; } = null!;

        public bool UseSsl { get; set; }
        public bool UseStartTls { get; set; }
    }
}

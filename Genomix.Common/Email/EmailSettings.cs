namespace Genomix.Common.Email
{
    public class EmailSettings
    {
        public string FromName { get; set; } = "";
        public string FromAddress { get; set; } = "";
        public string Host { get; set; } = "";
        public int Port { get; set; } = 2525;
        public string User { get; set; } = "";
        public string Password { get; set; } = "";
        public bool EnableSsl { get; set; } = true;
    }
}

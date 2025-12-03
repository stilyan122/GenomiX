using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.AspNetCore.Identity.UI.Services;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MimeKit;

namespace Genomix.Common.Email
{
    public class EmailSender : IEmailSender
    {
        private readonly ILogger<EmailSender> _logger;
        private readonly EmailSettings _settings;

        public EmailSender(
            ILogger<EmailSender> logger,
            IOptions<EmailSettings> options)
        {
            _logger = logger;
            _settings = options.Value;   
        }

        public async Task SendEmailAsync(string email, string subject, string htmlMessage)
        {
            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(_settings.FromName, _settings.FromAddress));
            message.To.Add(MailboxAddress.Parse(email));
            message.Subject = subject;
            message.Body = new TextPart("html") { Text = htmlMessage };

            using var client = new SmtpClient();

            SecureSocketOptions socketOptions;
            if (_settings.UseSsl)
                socketOptions = SecureSocketOptions.SslOnConnect;
            else if (_settings.UseStartTls)
                socketOptions = SecureSocketOptions.StartTls;
            else
                socketOptions = SecureSocketOptions.None;

            try
            {
                await client.ConnectAsync(_settings.Host, _settings.Port, socketOptions);

                if (!string.IsNullOrEmpty(_settings.User))
                    await client.AuthenticateAsync(_settings.User, _settings.Password);

                await client.SendAsync(message);
                await client.DisconnectAsync(true);

                _logger.LogInformation("Email sent to {Email}", email);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending email to {Email}", email);
            }
        }
    }
}

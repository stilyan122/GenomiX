using Genomix.Common.Email;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.AspNetCore.Identity.UI.Services;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MimeKit;

public sealed class EmailSender : IEmailSender
{
    private readonly EmailSettings _opt;
    private readonly ILogger<EmailSender> _logger;

    public EmailSender(IOptions<EmailSettings> opt, ILogger<EmailSender> logger)
    {
        _opt = opt.Value;
        _logger = logger;
    }

    public async Task SendEmailAsync(string email, string subject, string htmlMessage)
    {
        if (string.IsNullOrWhiteSpace(_opt.Host))
            throw new InvalidOperationException("SMTP Host is not configured (Email:Host).");

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(_opt.FromName, _opt.FromEmail));
        message.To.Add(MailboxAddress.Parse(email));
        message.Subject = subject;

        message.Body = new BodyBuilder
        {
            HtmlBody = htmlMessage
        }.ToMessageBody();

        var secure = _opt.UseSsl
            ? SecureSocketOptions.SslOnConnect
            : (_opt.UseStartTls ? SecureSocketOptions.StartTls : SecureSocketOptions.None);

        using var client = new SmtpClient();

        try
        {
            await client.ConnectAsync(_opt.Host, _opt.Port, secure);

            client.AuthenticationMechanisms.Remove("XOAUTH2");

            if (!string.IsNullOrWhiteSpace(_opt.Username))
                await client.AuthenticateAsync(_opt.Username, _opt.Password);

            await client.SendAsync(message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email to {Email}. Subject: {Subject}", email, subject);
            throw; 
        }
        finally
        {
            await client.DisconnectAsync(true);
        }
    }
}
    
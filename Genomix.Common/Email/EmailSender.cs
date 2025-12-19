using Genomix.Common.Email;
using Microsoft.AspNetCore.Identity.UI.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System.Net;
using System.Net.Mail;

public sealed class EmailSender : IEmailSender
{
    private readonly IConfiguration _cfg;
    private readonly ILogger<EmailSender> _log;

    public EmailSender(IConfiguration cfg, ILogger<EmailSender> log)
    {
        _cfg = cfg; _log = log;
    }

    public async Task SendEmailAsync(string email, string subject, string htmlMessage)
    {
        var s = _cfg.GetSection("Email");
        var host = s["Host"]!;
        var port = int.Parse(s["Port"] ?? "2525");
        var user = s["User"]!;
        var pass = s["Password"]!;
        var from = s["FromAddress"]!;
        var name = s["FromName"] ?? "GenomiX";
        var enableSsl = bool.TryParse(s["EnableSsl"], out var ssl) ? ssl : true;

        using var msg = new MailMessage
        {
            From = new MailAddress(from, name),
            Subject = subject,
            Body = htmlMessage,
            IsBodyHtml = true
        };
        msg.To.Add(email);

        using var client = new SmtpClient(host, port)
        {
            Credentials = new NetworkCredential(user, pass),
            EnableSsl = enableSsl
        };

        try
        {
            _log.LogInformation("SMTP → {host}:{port} SSL:{ssl} From:{from} To:{to}",
                                host, port, enableSsl, from, email);
            await client.SendMailAsync(msg);
            _log.LogInformation("SMTP OK");
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "SMTP FAILED");
            throw;
        }
    }
}
    
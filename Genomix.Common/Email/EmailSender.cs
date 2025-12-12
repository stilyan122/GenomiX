using Genomix.Common.Email;
using MailKit;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.AspNetCore.Identity.UI.Services;
using Microsoft.Extensions.Options;
using MimeKit;

public sealed class EmailSender : IEmailSender
{
    private readonly EmailSettings _opt;
    public EmailSender(IOptions<EmailSettings> options) => _opt = options.Value;

    public async Task SendEmailAsync(string to, string subject, string html)
    {
        var msg = new MimeMessage();
        msg.From.Add(new MailboxAddress(_opt.FromName, _opt.FromAddress));
        msg.To.Add(MailboxAddress.Parse(to));
        msg.Subject = subject;
        msg.Body = new BodyBuilder { HtmlBody = html }.ToMessageBody();

        using var logger = new ProtocolLogger("smtp-protocol.log"); 
        using var smtp = new SmtpClient(logger);

        await smtp.ConnectAsync(_opt.Host, _opt.Port, SecureSocketOptions.StartTls);
        await smtp.AuthenticateAsync(_opt.User, _opt.Password);
        await smtp.SendAsync(msg);
        await smtp.DisconnectAsync(true);
    }
}

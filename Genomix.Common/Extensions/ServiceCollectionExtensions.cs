using Genomix.Common.Email;
using GenomiX.Core.Interfaces;
using GenomiX.Core.Services;
using GenomiX.Infrastructure;
using GenomiX.Infrastructure.Models;
using GenomiX.Infrastructure.Repo;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.UI.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Genomix.Common.Extensions
{
    public static class ServiceCollectionExtensions
    {
        // Database services
        public static IServiceCollection AddGenomixDBServices(this IServiceCollection services, string connectionString)
        {
            services
                .AddDbContext<ApplicationDbContext>(options => options.UseSqlServer(connectionString))
                .AddDefaultIdentity<GenUser>(options =>
                {
                    options.Password.RequiredLength = 6;
                    options.SignIn.RequireConfirmedAccount = true;
                    options.SignIn.RequireConfirmedEmail = true;
                    options.User.RequireUniqueEmail = true;
                    options.Password.RequireDigit = false;
                    options.SignIn.RequireConfirmedPhoneNumber = false;
                    options.Password.RequireNonAlphanumeric = false;
                    options.Password.RequireLowercase = false;
                    options.Password.RequireUppercase = false;
                })
                .AddRoles<IdentityRole<Guid>>()
                .AddEntityFrameworkStores<ApplicationDbContext>()
                .AddDefaultTokenProviders(); 

            return services;
        }

        // App services
        public static IServiceCollection AddGenomixAppServices(
            this IServiceCollection services,
            IConfiguration configuration,
            string emailSectionName = "Email")
        {
            services
                .AddScoped(typeof(IRepository<>), typeof(Repository<>))
                .AddScoped<IDNAService, DNAService>()
                .AddScoped<IOrganismService, OrganismService>()
                .AddScoped<ISequenceService, SequenceService>();

            var emailSection = configuration.GetSection(emailSectionName);

            services.Configure<EmailSettings>(emailSection);

            services.AddTransient<IEmailSender, EmailSender>();

            return services;
        }

        // Authentication services

        public static IServiceCollection AddAuthenticationServices(this IServiceCollection services,
            IConfiguration configuration)
        {
            var authBuilder = services.AddAuthentication();

            var gId = configuration["Auth:Google:ClientId"];
            var gSecret = configuration["Auth:Google:ClientSecret"];
            if (!string.IsNullOrWhiteSpace(gId) && !string.IsNullOrWhiteSpace(gSecret))
            {
                authBuilder.AddGoogle(o =>
                {
                    o.ClientId = gId!;
                    o.ClientSecret = gSecret!;
                    o.SaveTokens = true;
                });
            }

            var fId = configuration["Auth:Facebook:AppId"];
            var fSecret = configuration["Auth:Facebook:AppSecret"];
            if (!string.IsNullOrWhiteSpace(fId) && !string.IsNullOrWhiteSpace(fSecret))
            {
                authBuilder.AddFacebook(o =>
                {
                    o.AppId = fId!;
                    o.AppSecret = fSecret!;
                    o.Fields.Add("email");
                    o.SaveTokens = true;
                });
            }

            return services;
        }
    }
}

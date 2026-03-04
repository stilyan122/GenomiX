using GenomiX.Common.Email;
using GenomiX.Core.Interfaces;
using GenomiX.Core.Services;
using GenomiX.Infrastructure;
using GenomiX.Infrastructure.Models;
using GenomiX.Infrastructure.Repo;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.UI.Services;
using Microsoft.AspNetCore.Localization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using System.Globalization;

namespace GenomiX.Common.Extensions
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
                .AddScoped<ISequenceService, SequenceService>()
                .AddScoped<ISimulationService, SimulationService>()
                .AddScoped<IUserService, UserService>();

            var emailSection = configuration.GetSection(emailSectionName);

            services.Configure<EmailSettings>(emailSection);

            services.AddTransient<IEmailSender, EmailSender>();

            return services;
        }

        // Localization services
        public static IServiceCollection AddLocalizationServices(this IServiceCollection services)
        {
            services
                .AddControllersWithViews()
                .AddViewLocalization()
                .AddDataAnnotationsLocalization();

            services
                .AddRazorPages()
                .AddViewLocalization()
                .AddDataAnnotationsLocalization();

            services.AddLocalization(options =>
            {
                options.ResourcesPath = "Resources";
            });

            var supportedCultures = new[] { "en", "bg", "bg-BG" }
                .Select(c => new CultureInfo(c))
                .ToList();

            services.Configure<RequestLocalizationOptions>(options =>
            {
                options.DefaultRequestCulture = new RequestCulture("en");
                options.SupportedCultures = supportedCultures;
                options.SupportedUICultures = supportedCultures;

                options.RequestCultureProviders = new IRequestCultureProvider[]
                {
                    new CookieRequestCultureProvider(),
                    new QueryStringRequestCultureProvider(),
                    new AcceptLanguageHeaderRequestCultureProvider()
                };
            });

            return services;
        }

        // Authentication services

        public static IServiceCollection AddAuthenticationServices(this IServiceCollection services,
            IConfiguration configuration)
        {
            var authBuilder = services.AddAuthentication();

            var gId = configuration["Auth:Google:ClientId"] ?? "";
            var gSecret = configuration["Auth:Google:ClientSecret"] ?? "";

            RegisterGoogle(gId, gSecret, authBuilder);

            var fId = configuration["Auth:Facebook:AppId"] ?? "";
            var fSecret = configuration["Auth:Facebook:AppSecret"] ?? "";

            RegisterFacebook(fId, fSecret, authBuilder);

            var ghId = configuration["Auth:GitHub:ClientId"] ?? "";
            var ghSecret = configuration["Auth:GitHub:ClientSecret"] ?? "";

            RegisterGitHub(ghId, ghSecret, authBuilder);


            return services;
        }

        private static void RegisterGoogle(string id, string secret, AuthenticationBuilder authBuilder)
        {
            if (!string.IsNullOrWhiteSpace(id) && !string.IsNullOrWhiteSpace(secret))
            {
                authBuilder.AddGoogle(o =>
                {
                    o.ClientId = id!;
                    o.ClientSecret = secret!;
                    o.SaveTokens = true;
                });
            }
        }

        private static void RegisterFacebook(string id, string secret, AuthenticationBuilder authBuilder)
        {
            if (!string.IsNullOrWhiteSpace(id) && !string.IsNullOrWhiteSpace(secret))
            {
                authBuilder.AddFacebook(o =>
                {
                    o.AppId = id!;
                    o.AppSecret = secret!;
                    o.Fields.Add("email");
                    o.SaveTokens = true;
                });
            }
        }

        private static void RegisterGitHub(string id, string secret, AuthenticationBuilder authBuilder)
        {
            if (!string.IsNullOrWhiteSpace(id) && !string.IsNullOrWhiteSpace(secret))
            {
                authBuilder.AddGitHub(options =>
                {
                    options.ClientId = id!;
                    options.ClientSecret = secret!;    
                    options.SaveTokens = true;

                    options.Scope.Add("user:email");
                });
            }   
        }

        private sealed class GithubEmail
        {
            public string Email { get; set; } = "";
            public bool Primary { get; set; }
            public bool Verified { get; set; }
        }
    }
}

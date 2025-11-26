using GenomiX.Core.Interfaces;
using GenomiX.Core.Services;
using GenomiX.Infrastructure;
using GenomiX.Infrastructure.Models;
using GenomiX.Infrastructure.Repo;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace GenomiX.Common.Extensions
{
    public static class ServiceCollectionExtensions
    {
        public static IServiceCollection AddGenomixDBServices(this IServiceCollection services, string connectionString)
        {
            services
                .AddDbContext<ApplicationDbContext>(options => options.UseSqlServer(connectionString))
                .AddDefaultIdentity<GenUser>(options =>
                {
                    options.SignIn.RequireConfirmedAccount = false;
                    options.SignIn.RequireConfirmedPhoneNumber = false;
                    options.SignIn.RequireConfirmedEmail = false;
                    options.Password.RequireDigit = false;
                    options.Password.RequiredLength = 6;
                    options.Password.RequireNonAlphanumeric = false;
                    options.Password.RequireLowercase = false;
                    options.Password.RequireUppercase = false;
                })
                .AddRoles<IdentityRole<Guid>>()
                .AddEntityFrameworkStores<ApplicationDbContext>();

            return services;
        }

        // App services only (sync)
        public static IServiceCollection AddGenomixAppServices(this IServiceCollection services)
        {
            services
                .AddScoped(typeof(IRepository<>), typeof(Repository<>))
                .AddScoped<IDNAService, DNAService>()
                .AddScoped<IOrganismService, OrganismService>()
                .AddScoped<ISequenceService, SequenceService>();

            return services;
        }
    }
}

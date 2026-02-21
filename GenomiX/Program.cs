using Microsoft.EntityFrameworkCore;
using GenomiX.Common.Extensions;

namespace GenomiX
{
    public class Program
    {
        public static async Task Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            var connectionString = builder.Configuration
                .GetConnectionString("DefaultConnection") ?? 
                throw new InvalidOperationException("Connection string not found.");

            builder.Services
                .AddDatabaseDeveloperPageExceptionFilter()
                .AddGenomixDBServices(connectionString)
                .AddGenomixAppServices(builder.Configuration)
                .AddAuthenticationServices(builder.Configuration);

            builder.Services.AddRazorPages();
           
            builder.Services.AddControllersWithViews();

            var app = builder.Build();

            if (app.Environment.IsDevelopment())
            {
                app.UseMigrationsEndPoint();
            }
            else
            {
                app.UseExceptionHandler("/Home/Error");
                app.UseHsts();
            }

            app.UseHttpsRedirection();
            app.UseRouting();

            app.UseAuthentication();
            app.UseAuthorization();

            app.MapStaticAssets();

            app.MapAppRoutes();

            app.MapRazorPages()
               .WithStaticAssets();

            await app.UseKnownIdentityPasswordsAsync();

            app.Run();
        }
    }
}

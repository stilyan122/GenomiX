using GenomiX.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace GenomiX.Tests.TestHelpers;

public static class TestDbFactory
{
    public static ApplicationDbContext CreateDb(string? dbName = null)
    {
        dbName ??= Guid.NewGuid().ToString("N");

        var opt = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(dbName)
            .EnableSensitiveDataLogging()
            .Options;

        return new ApplicationDbContext(opt);
    }
}
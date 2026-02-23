using GenomiX.Infrastructure.Repo;
using Microsoft.EntityFrameworkCore;

namespace GenomiX.Tests.TestHelpers;

public sealed class EfTestRepository<T> : IRepository<T> where T : class
{
    private readonly DbContext _db;

    public EfTestRepository(DbContext db) => _db = db;

    public IQueryable<T> GetAll() => _db.Set<T>();

    public async Task AddAsync(T entity)
    {
        await _db.Set<T>().AddAsync(entity);
        await _db.SaveChangesAsync();
    }

    public async Task UpdateAsync(T entity)
    {
        _db.Set<T>().Update(entity);
        await _db.SaveChangesAsync();
    }

    public async Task DeleteAsync(object id)
    {
        var entity = await GetByIdAsync(id);
        if (entity == null) return;

        _db.Set<T>().Remove(entity);
        await _db.SaveChangesAsync();
    }

    public async Task<T?> GetByIdAsync(object id)
    {
        return await _db.Set<T>().FindAsync(id);
    }
}
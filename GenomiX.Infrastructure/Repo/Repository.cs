
using Microsoft.EntityFrameworkCore;

namespace GenomiX.Infrastructure.Repo
{
    /// <summary>
    /// Provides a generic repository implementation for basic CRUD operations using Entity Framework Core.
    /// </summary>
    /// <typeparam name="T">The entity type.</typeparam>
    public class Repository<T> : IRepository<T>
        where T : class
    {
        private readonly ApplicationDbContext _context;
        private readonly DbSet<T> _dbSet;

        /// <summary>
        /// Initializes a new instance of the <see cref="Repository{T}"/> class.
        /// </summary>
        /// <param name="context">The database context.</param>
        public Repository(ApplicationDbContext context)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _dbSet = _context.Set<T>();
        }

        /// <inheritdoc/>
        public IQueryable<T> GetAll()
        {
            return _dbSet;
        }

        /// <inheritdoc/>
        public async Task<T?> GetByIdAsync(object id)
        {
            return await _dbSet.FindAsync(id);
        }

        /// <inheritdoc/>
        public async Task AddAsync(T entity)
        {
            await _dbSet.AddAsync(entity);
            await _context.SaveChangesAsync();
        }

        /// <inheritdoc/>
        public async Task UpdateAsync(T entity)
        {
            _dbSet.Update(entity);
            await _context.SaveChangesAsync();
        }

        /// <inheritdoc/>
        public async Task DeleteAsync(object id)
        {
            var entity = await GetByIdAsync(id);

            if (entity != null)
            {
                _dbSet.Remove(entity);
                await _context.SaveChangesAsync();
            }
        }
    }
}

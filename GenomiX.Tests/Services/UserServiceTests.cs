using GenomiX.Core.Services;
using GenomiX.Core.Services;
using GenomiX.Infrastructure.Models;
using GenomiX.Tests.TestHelpers;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Moq;
using NUnit.Framework;
using Assert = NUnit.Framework.Assert;

namespace GenomiX.Tests.Services
{
    [TestFixture]
    public class UserServiceTests
    {
        private static Mock<UserManager<GenUser>> CreateUserManager()
        {
            var store = new Mock<IUserStore<GenUser>>();
            return new Mock<UserManager<GenUser>>(
                store.Object, null!, null!, null!, null!, null!, null!, null!, null!
            );
        }

        [Test]
        public async Task GetRolesAsync_ReturnsEmpty_WhenUserMissing()
        {
            using var db = TestDbFactory.CreateDb();
            var um = CreateUserManager();
            var sut = new UserService(db, um.Object);

            var roles = await sut.GetRolesAsync(Guid.NewGuid());
            Assert.That(roles, Is.Empty);
        }

        [Test]
        public async Task GetRolesAsync_ReturnsSortedRoles()
        {
            using var db = TestDbFactory.CreateDb();
            var um = CreateUserManager();
            var sut = new UserService(db, um.Object);

            var user = new GenUser
            {
                Id = Guid.NewGuid(),
                UserName = "u",
                Email = "u@x.com",
                FirstName = "Test",
                LastName = "User"
            };
            db.Users.Add(user);
            await db.SaveChangesAsync();

            um.Setup(x => x.GetRolesAsync(user)).ReturnsAsync(new List<string> { "Scientist", "Admin", "User" });

            var roles = await sut.GetRolesAsync(user.Id);
            Assert.That(roles, Is.EqualTo(new[] { "Admin", "Scientist", "User" }));
        }

        [Test]
        public async Task GetAllUsersAsync_ReturnsRows_AndSortsByUserName()
        {
            using var db = TestDbFactory.CreateDb();
            var um = CreateUserManager();

            um.Setup(x => x.GetRolesAsync(It.IsAny<GenUser>()))
              .ReturnsAsync(new List<string>());

            var sut = new UserService(db, um.Object);

            var uB = new GenUser { Id = Guid.NewGuid(), UserName = "b", FirstName = "B", LastName = "Z", Email = "b@x.com" };
            var uA = new GenUser { Id = Guid.NewGuid(), UserName = "a", FirstName = "A", LastName = "Z", Email = "a@x.com" };

            db.Users.AddRange(uB, uA);
            await db.SaveChangesAsync();

            um.Setup(x => x.GetRolesAsync(It.Is<GenUser>(u => u.Id == uA.Id)))
              .ReturnsAsync(new List<string> { "User" });

            um.Setup(x => x.GetRolesAsync(It.Is<GenUser>(u => u.Id == uB.Id)))
              .ReturnsAsync(new List<string> { "Admin", "User" });

            var rows = await sut.GetAllUsersAsync();

            Assert.That(rows.Count, Is.EqualTo(2));
            Assert.That(rows[0].Email, Is.EqualTo("a@x.com"));
            Assert.That(rows[1].Email, Is.EqualTo("b@x.com"));

            Assert.That(rows[1].Roles, Is.EqualTo(new[] { "Admin", "User" }));
        }

        [Test]
        public async Task GetRoleRequestsAsync_FiltersByStatus_AndMapsUserFields()
        {
            using var db = TestDbFactory.CreateDb();
            var um = CreateUserManager();
            var sut = new UserService(db, um.Object);

            var user = new GenUser { Id = Guid.NewGuid(), FirstName = "St", LastName = "Il", Email = "s@x.com", UserName = "st" };
            db.Users.Add(user);

            db.RoleRequests.AddRange(
                new RoleRequest { Id = 1, UserId = user.Id, RequestedRole = "Scientist", RequestType = "Add", Status = "Pending", CreatedAt = DateTime.UtcNow },
                new RoleRequest { Id = 2, UserId = user.Id, RequestedRole = "Scientist", RequestType = "Add", Status = "Approved", CreatedAt = DateTime.UtcNow.AddMinutes(-1) }
            );

            await db.SaveChangesAsync();

            var pending = await sut.GetRoleRequestsAsync("Pending");

            Assert.That(pending.Count, Is.EqualTo(1));
            Assert.That(pending[0].Status, Is.EqualTo("Pending"));
            Assert.That(pending[0].Email, Is.EqualTo("s@x.com"));
        }

        [Test]
        public void ApproveRoleRequestAsync_Throws_WhenRequestNotFound()
        {
            using var db = TestDbFactory.CreateDb();
            var um = CreateUserManager();
            var sut = new UserService(db, um.Object);

            Assert.ThrowsAsync<InvalidOperationException>(async () =>
                await sut.ApproveRoleRequestAsync(999)
            );
        }

        [Test]
        public async Task ApproveRoleRequestAsync_DoesNothing_WhenNotPending()
        {
            using var db = TestDbFactory.CreateDb();
            var um = CreateUserManager();
            var sut = new UserService(db, um.Object);

            var user = new GenUser
            {
                Id = Guid.NewGuid(),
                UserName = "u",
                Email = "u@x.com",
                FirstName = "Test",
                LastName = "User"
            };
            db.Users.Add(user);
            db.RoleRequests.Add(new RoleRequest
            {
                Id = 1,
                UserId = user.Id,
                RequestedRole = "Scientist",
                RequestType = "Add",
                Status = "Approved",
                CreatedAt = DateTime.UtcNow,
                User = user
            });
            await db.SaveChangesAsync();

            await sut.ApproveRoleRequestAsync(1);

            um.Verify(x => x.AddToRoleAsync(It.IsAny<GenUser>(), It.IsAny<string>()), Times.Never);
            var req = await db.RoleRequests.FirstAsync(r => r.Id == 1);
            Assert.That(req.Status, Is.EqualTo("Approved"));
        }

        [Test]
        public async Task ApproveRoleRequestAsync_Add_AddsRole_AndMarksApproved()
        {
            using var db = TestDbFactory.CreateDb();
            var um = CreateUserManager();
            var sut = new UserService(db, um.Object);

            var user = new GenUser
            {
                Id = Guid.NewGuid(),
                UserName = "u",
                Email = "u@x.com",
                FirstName = "Test",
                LastName = "User"
            };
            db.Users.Add(user);

            db.RoleRequests.Add(new RoleRequest
            {
                Id = 1,
                UserId = user.Id,
                RequestedRole = "Scientist",
                RequestType = "Add",
                Status = "Pending",
                CreatedAt = DateTime.UtcNow,
                User = user
            });

            await db.SaveChangesAsync();

            um.Setup(x => x.IsInRoleAsync(user, "Scientist")).ReturnsAsync(false);
            um.Setup(x => x.AddToRoleAsync(user, "Scientist")).ReturnsAsync(IdentityResult.Success);

            await sut.ApproveRoleRequestAsync(1);

            um.Verify(x => x.AddToRoleAsync(user, "Scientist"), Times.Once);

            var req = await db.RoleRequests.FirstAsync(r => r.Id == 1);
            Assert.That(req.Status, Is.EqualTo("Approved"));
            Assert.That(req.DecidedAt, Is.Not.Null);
        }

        [Test]
        public async Task ApproveRoleRequestAsync_Remove_RemovesRole_AndMarksApproved()
        {
            using var db = TestDbFactory.CreateDb();
            var um = CreateUserManager();
            var sut = new UserService(db, um.Object);

            var user = new GenUser
            {
                Id = Guid.NewGuid(),
                UserName = "u",
                Email = "u@x.com",
                FirstName = "Test",
                LastName = "User"
            };
            db.Users.Add(user);

            db.RoleRequests.Add(new RoleRequest
            {
                Id = 2,
                UserId = user.Id,
                RequestedRole = "Scientist",
                RequestType = "Remove",
                Status = "Pending",
                CreatedAt = DateTime.UtcNow,
                User = user
            });

            await db.SaveChangesAsync();

            um.Setup(x => x.IsInRoleAsync(user, "Scientist")).ReturnsAsync(true);
            um.Setup(x => x.RemoveFromRoleAsync(user, "Scientist")).ReturnsAsync(IdentityResult.Success);

            await sut.ApproveRoleRequestAsync(2);

            um.Verify(x => x.RemoveFromRoleAsync(user, "Scientist"), Times.Once);

            var req = await db.RoleRequests.FirstAsync(r => r.Id == 2);
            Assert.That(req.Status, Is.EqualTo("Approved"));
            Assert.That(req.DecidedAt, Is.Not.Null);
        }

        [Test]
        public async Task ApproveRoleRequestAsync_Throws_OnInvalidRequestType()
        {
            using var db = TestDbFactory.CreateDb();
            var um = CreateUserManager();
            var sut = new UserService(db, um.Object);

            var user = new GenUser
            {
                Id = Guid.NewGuid(),
                UserName = "u",
                Email = "u@x.com",
                FirstName = "Test",
                LastName = "User"
            };
            db.Users.Add(user);

            db.RoleRequests.Add(new RoleRequest
            {
                Id = 3,
                UserId = user.Id,
                RequestedRole = "Scientist",
                RequestType = "SomethingElse",
                Status = "Pending",
                CreatedAt = DateTime.UtcNow,
                User = user
            });

            await db.SaveChangesAsync();

            Assert.ThrowsAsync<InvalidOperationException>(async () =>
                await sut.ApproveRoleRequestAsync(3)
            );
        }

        [Test]
        public async Task DeclineRoleRequestAsync_SetsDeclined_AndTrimsReason()
        {
            using var db = TestDbFactory.CreateDb();
            var um = CreateUserManager();
            var sut = new UserService(db, um.Object);

            var user = new GenUser
            {
                Id = Guid.NewGuid(),
                UserName = "u",
                Email = "u@x.com",
                FirstName = "Test",
                LastName = "User"
            };
            db.Users.Add(user);

            db.RoleRequests.Add(new RoleRequest
            {
                Id = 10,
                UserId = user.Id,
                RequestedRole = "Scientist",
                RequestType = "Add",
                Status = "Pending",
                CreatedAt = DateTime.UtcNow
            });

            await db.SaveChangesAsync();

            await sut.DeclineRoleRequestAsync(10, "  not enough info  ");

            var req = await db.RoleRequests.FirstAsync(r => r.Id == 10);
            Assert.That(req.Status, Is.EqualTo("Declined"));
            Assert.That(req.Note, Is.EqualTo("not enough info"));
            Assert.That(req.DecidedAt, Is.Not.Null);
        }

        [Test]
        public async Task DeleteRoleRequestAsync_RemovesIfExists()
        {
            using var db = TestDbFactory.CreateDb();
            var um = CreateUserManager();
            var sut = new UserService(db, um.Object);

            db.RoleRequests.Add(new RoleRequest
            {
                Id = 7,
                UserId = Guid.NewGuid(),
                RequestedRole = "Scientist",
                RequestType = "Add",
                Status = "Pending",
                CreatedAt = DateTime.UtcNow
            });

            await db.SaveChangesAsync();

            await sut.DeleteRoleRequestAsync(7);

            Assert.That(await db.RoleRequests.CountAsync(), Is.EqualTo(0));
        }

        [Test]
        public async Task GetUserByIdAsync_ReturnsNull_WhenMissing()
        {
            using var db = TestDbFactory.CreateDb();
            var um = CreateUserManager();
            var sut = new UserService(db, um.Object);

            var row = await sut.GetUserByIdAsync(Guid.NewGuid());
            Assert.That(row, Is.Null);
        }

        [Test]
        public async Task AddRoleAsync_Throws_WhenAdmin()
        {
            using var db = TestDbFactory.CreateDb();
            var um = CreateUserManager();
            var sut = new UserService(db, um.Object);

            var user = new GenUser
            {
                Id = Guid.NewGuid(),
                UserName = "u",
                Email = "u@x.com",
                FirstName = "Test",
                LastName = "User"
            };
            db.Users.Add(user);
            await db.SaveChangesAsync();

            Assert.ThrowsAsync<InvalidOperationException>(async () =>
                await sut.AddRoleAsync(user.Id, "Admin")
            );
        }

        [Test]
        public async Task AddRoleAsync_AddsRole_WhenNotInRole()
        {
            using var db = TestDbFactory.CreateDb();
            var um = CreateUserManager();
            var sut = new UserService(db, um.Object);

            var user = new GenUser
            {
                Id = Guid.NewGuid(),
                UserName = "u",
                Email = "u@x.com",
                FirstName = "Test",
                LastName = "User"
            };
            db.Users.Add(user);
            await db.SaveChangesAsync();

            um.Setup(x => x.IsInRoleAsync(user, "Scientist")).ReturnsAsync(false);
            um.Setup(x => x.AddToRoleAsync(user, "Scientist")).ReturnsAsync(IdentityResult.Success);

            await sut.AddRoleAsync(user.Id, " Scientist ");

            um.Verify(x => x.AddToRoleAsync(user, "Scientist"), Times.Once);
        }

        [Test]
        public async Task RemoveRoleAsync_Removes_WhenInRole()
        {
            using var db = TestDbFactory.CreateDb();
            var um = CreateUserManager();
            var sut = new UserService(db, um.Object);

            var user = new GenUser
            {
                Id = Guid.NewGuid(),
                UserName = "u",
                Email = "u@x.com",
                FirstName = "Test",
                LastName = "User"
            };
            db.Users.Add(user);
            await db.SaveChangesAsync();

            um.Setup(x => x.IsInRoleAsync(user, "Scientist")).ReturnsAsync(true);
            um.Setup(x => x.RemoveFromRoleAsync(user, "Scientist")).ReturnsAsync(IdentityResult.Success);

            await sut.RemoveRoleAsync(user.Id, "Scientist");

            um.Verify(x => x.RemoveFromRoleAsync(user, "Scientist"), Times.Once);
        }

        [Test]
        public async Task RemoveRoleAsync_Throws_WhenAdmin()
        {
            using var db = TestDbFactory.CreateDb();
            var um = CreateUserManager();
            var sut = new UserService(db, um.Object);

            var user = new GenUser
            {
                Id = Guid.NewGuid(),
                UserName = "u",
                Email = "u@x.com",
                FirstName = "Test",
                LastName = "User"
            };
            db.Users.Add(user);
            await db.SaveChangesAsync();

            Assert.ThrowsAsync<InvalidOperationException>(async () =>
                await sut.RemoveRoleAsync(user.Id, "Admin")
            );
        }

        [Test]
        public async Task GetUserByIdAsync_ReturnsRow_WithSortedRoles()
        {
            using var db = TestDbFactory.CreateDb();
            var um = CreateUserManager();
            var sut = new UserService(db, um.Object);

            var user = new GenUser
            {
                Id = Guid.NewGuid(),
                UserName = "u",
                Email = "u@x.com",
                FirstName = "Test",
                LastName = "User"
            };
            db.Users.Add(user);
            await db.SaveChangesAsync();

            um.Setup(x => x.GetRolesAsync(user)).ReturnsAsync(new List<string> { "User", "Admin", "Scientist" });

            var row = await sut.GetUserByIdAsync(user.Id);

            Assert.That(row, Is.Not.Null);
            Assert.That(row!.Email, Is.EqualTo("u@x.com"));
            Assert.That(row.Roles, Is.EqualTo(new[] { "Admin", "Scientist", "User" }));
        }

        [Test]
        public async Task GetRoleRequestsAsync_WhenStatusEmpty_ReturnsAll()
        {
            using var db = TestDbFactory.CreateDb();
            var um = CreateUserManager();
            var sut = new UserService(db, um.Object);

            var user = new GenUser { Id = Guid.NewGuid(), FirstName = "A", LastName = "B", Email = "a@x.com", UserName = "a" };
            db.Users.Add(user);

            db.RoleRequests.AddRange(
                new RoleRequest { Id = 1, UserId = user.Id, RequestedRole = "Scientist", RequestType = "Add", Status = "Pending", CreatedAt = DateTime.UtcNow },
                new RoleRequest { Id = 2, UserId = user.Id, RequestedRole = "Scientist", RequestType = "Add", Status = "Approved", CreatedAt = DateTime.UtcNow.AddMinutes(-1) }
            );

            await db.SaveChangesAsync();

            var all = await sut.GetRoleRequestsAsync("");

            Assert.That(all.Count, Is.EqualTo(2));
        }

        [Test]
        public async Task GetRoleRequestsAsync_MapsUnknownUser_WhenNavigationMissing()
        {
            using var db = TestDbFactory.CreateDb();
            var um = CreateUserManager();
            var sut = new UserService(db, um.Object);

            var uA = new GenUser { Id = Guid.NewGuid(), UserName = "a", FirstName = "A", LastName = "Z", Email = "a@x.com" };
            
            db.RoleRequests.Add(new RoleRequest
            {
                Id = 5,
                UserId = uA.Id,
                RequestedRole = "Scientist",
                RequestType = "Add",
                Status = "Pending",
                CreatedAt = DateTime.UtcNow,
                User = uA
            });
            await db.SaveChangesAsync();

            var rows = await sut.GetRoleRequestsAsync("Pending");

            Assert.That(rows.Count, Is.EqualTo(1));
            Assert.That(rows[0].UserName, Is.EqualTo(uA.FirstName + " " + uA.LastName));
            Assert.That(rows[0].Email, Is.EqualTo(uA.Email));
        }

        [Test]
        public async Task GetRoleRequestsForUserAsync_ReturnsOnlyUserRequests_OrderedDesc()
        {
            using var db = TestDbFactory.CreateDb();
            var um = CreateUserManager();
            var sut = new UserService(db, um.Object);

            var u1 = new GenUser { Id = Guid.NewGuid(), FirstName = "A", LastName = "B", Email = "a@x.com", UserName = "a" };
            var u2 = new GenUser { Id = Guid.NewGuid(), FirstName = "C", LastName = "D", Email = "c@x.com", UserName = "c" };
            db.Users.AddRange(u1, u2);

            db.RoleRequests.AddRange(
                new RoleRequest { Id = 1, UserId = u1.Id, RequestedRole = "Scientist", RequestType = "Add", Status = "Pending", CreatedAt = DateTime.UtcNow.AddMinutes(-1) },
                new RoleRequest { Id = 2, UserId = u1.Id, RequestedRole = "Scientist", RequestType = "Remove", Status = "Pending", CreatedAt = DateTime.UtcNow },
                new RoleRequest { Id = 3, UserId = u2.Id, RequestedRole = "Scientist", RequestType = "Add", Status = "Pending", CreatedAt = DateTime.UtcNow }
            );

            await db.SaveChangesAsync();

            var rows = await sut.GetRoleRequestsForUserAsync(u1.Id);

            Assert.That(rows.Count, Is.EqualTo(2));
            Assert.That(rows[0].Id, Is.EqualTo(2)); 
            Assert.That(rows[1].Id, Is.EqualTo(1));
            Assert.That(rows.All(r => r.UserId == u1.Id), Is.True);
        }

        [Test]
        public async Task ApproveRoleRequestAsync_Throws_WhenRequestUserMissing()
        {
            using var db = TestDbFactory.CreateDb();
            var um = CreateUserManager();
            var sut = new UserService(db, um.Object);

            db.RoleRequests.Add(new RoleRequest
            {
                Id = 1,
                UserId = Guid.NewGuid(),
                RequestedRole = "Scientist",
                RequestType = "Add",
                Status = "Pending",
                CreatedAt = DateTime.UtcNow,
                User = null 
            });
            await db.SaveChangesAsync();

            Assert.ThrowsAsync<InvalidOperationException>(async () =>
                await sut.ApproveRoleRequestAsync(1)
            );
        }

        [Test]
        public async Task ApproveRoleRequestAsync_Add_DoesNotCallAdd_WhenAlreadyInRole_ButMarksApproved()
        {
            using var db = TestDbFactory.CreateDb();
            var um = CreateUserManager();
            var sut = new UserService(db, um.Object);

            var user = new GenUser { Id = Guid.NewGuid(), UserName = "u", Email = "u@x.com", FirstName = "T", LastName = "U" };
            db.Users.Add(user);

            db.RoleRequests.Add(new RoleRequest
            {
                Id = 10,
                UserId = user.Id,
                RequestedRole = "Scientist",
                RequestType = "Add",
                Status = "Pending",
                CreatedAt = DateTime.UtcNow,
                User = user
            });
            await db.SaveChangesAsync();

            um.Setup(x => x.IsInRoleAsync(user, "Scientist")).ReturnsAsync(true);

            await sut.ApproveRoleRequestAsync(10);

            um.Verify(x => x.AddToRoleAsync(It.IsAny<GenUser>(), It.IsAny<string>()), Times.Never);

            var req = await db.RoleRequests.FirstAsync(r => r.Id == 10);
            Assert.That(req.Status, Is.EqualTo("Approved"));
        }

        [Test]
        public async Task ApproveRoleRequestAsync_Remove_DoesNotCallRemove_WhenUserNotInRole_ButMarksApproved()
        {
            using var db = TestDbFactory.CreateDb();
            var um = CreateUserManager();
            var sut = new UserService(db, um.Object);

            var user = new GenUser { Id = Guid.NewGuid(), UserName = "u", Email = "u@x.com", FirstName = "T", LastName = "U" };
            db.Users.Add(user);

            db.RoleRequests.Add(new RoleRequest
            {
                Id = 11,
                UserId = user.Id,
                RequestedRole = "Scientist",
                RequestType = "Remove",
                Status = "Pending",
                CreatedAt = DateTime.UtcNow,
                User = user
            });
            await db.SaveChangesAsync();

            um.Setup(x => x.IsInRoleAsync(user, "Scientist")).ReturnsAsync(false);

            await sut.ApproveRoleRequestAsync(11);

            um.Verify(x => x.RemoveFromRoleAsync(It.IsAny<GenUser>(), It.IsAny<string>()), Times.Never);

            var req = await db.RoleRequests.FirstAsync(r => r.Id == 11);
            Assert.That(req.Status, Is.EqualTo("Approved"));
        }

        [Test]
        public async Task ApproveRoleRequestAsync_Add_Throws_WhenIdentityFails()
        {
            using var db = TestDbFactory.CreateDb();
            var um = CreateUserManager();
            var sut = new UserService(db, um.Object);

            var user = new GenUser { Id = Guid.NewGuid(), UserName = "u", Email = "u@x.com", FirstName = "T", LastName = "U" };
            db.Users.Add(user);

            db.RoleRequests.Add(new RoleRequest
            {
                Id = 12,
                UserId = user.Id,
                RequestedRole = "Scientist",
                RequestType = "Add",
                Status = "Pending",
                CreatedAt = DateTime.UtcNow,
                User = user
            });
            await db.SaveChangesAsync();

            um.Setup(x => x.IsInRoleAsync(user, "Scientist")).ReturnsAsync(false);

            var fail = IdentityResult.Failed(new IdentityError { Description = "boom" });
            um.Setup(x => x.AddToRoleAsync(user, "Scientist")).ReturnsAsync(fail);

            var ex = Assert.ThrowsAsync<InvalidOperationException>(async () =>
                await sut.ApproveRoleRequestAsync(12)
            );
            Assert.That(ex!.Message, Does.Contain("boom"));
        }

        [Test]
        public async Task ApproveRoleRequestAsync_Remove_Throws_WhenIdentityFails()
        {
            using var db = TestDbFactory.CreateDb();
            var um = CreateUserManager();
            var sut = new UserService(db, um.Object);

            var user = new GenUser { Id = Guid.NewGuid(), UserName = "u", Email = "u@x.com", FirstName = "T", LastName = "U" };
            db.Users.Add(user);

            db.RoleRequests.Add(new RoleRequest
            {
                Id = 13,
                UserId = user.Id,
                RequestedRole = "Scientist",
                RequestType = "Remove",
                Status = "Pending",
                CreatedAt = DateTime.UtcNow,
                User = user
            });
            await db.SaveChangesAsync();

            um.Setup(x => x.IsInRoleAsync(user, "Scientist")).ReturnsAsync(true);

            var fail = IdentityResult.Failed(new IdentityError { Description = "nope" });
            um.Setup(x => x.RemoveFromRoleAsync(user, "Scientist")).ReturnsAsync(fail);

            var ex = Assert.ThrowsAsync<InvalidOperationException>(async () =>
                await sut.ApproveRoleRequestAsync(13)
            );
            Assert.That(ex!.Message, Does.Contain("nope"));
        }

        [Test]
        public void DeclineRoleRequestAsync_Throws_WhenRequestMissing()
        {
            using var db = TestDbFactory.CreateDb();
            var um = CreateUserManager();
            var sut = new UserService(db, um.Object);

            Assert.ThrowsAsync<InvalidOperationException>(async () =>
                await sut.DeclineRoleRequestAsync(999, "x")
            );
        }

        [Test]
        public async Task DeclineRoleRequestAsync_DoesNothing_WhenNotPending()
        {
            using var db = TestDbFactory.CreateDb();
            var um = CreateUserManager();
            var sut = new UserService(db, um.Object);

            db.RoleRequests.Add(new RoleRequest
            {
                Id = 20,
                UserId = Guid.NewGuid(),
                RequestedRole = "Scientist",
                RequestType = "Add",
                Status = "Approved",
                CreatedAt = DateTime.UtcNow
            });
            await db.SaveChangesAsync();

            await sut.DeclineRoleRequestAsync(20, "reason");

            var req = await db.RoleRequests.FirstAsync(r => r.Id == 20);
            Assert.That(req.Status, Is.EqualTo("Approved"));
            Assert.That(req.Note, Is.Null);
        }

        [Test]
        public async Task DeleteRoleRequestAsync_DoesNothing_WhenMissing()
        {
            using var db = TestDbFactory.CreateDb();
            var um = CreateUserManager();
            var sut = new UserService(db, um.Object);

            await sut.DeleteRoleRequestAsync(12345);

            Assert.That(await db.RoleRequests.CountAsync(), Is.EqualTo(0));
        }

        [Test]
        public void AddRoleAsync_Throws_WhenUserMissing()
        {
            using var db = TestDbFactory.CreateDb();
            var um = CreateUserManager();
            var sut = new UserService(db, um.Object);

            Assert.ThrowsAsync<InvalidOperationException>(async () =>
                await sut.AddRoleAsync(Guid.NewGuid(), "Scientist")
            );
        }

        [Test]
        public async Task AddRoleAsync_Throws_WhenRoleEmpty()
        {
            using var db = TestDbFactory.CreateDb();
            var um = CreateUserManager();
            var sut = new UserService(db, um.Object);

            var user = new GenUser { Id = Guid.NewGuid(), UserName = "u", Email = "u@x.com", FirstName = "T", LastName = "U" };
            db.Users.Add(user);
            await db.SaveChangesAsync();

            Assert.ThrowsAsync<InvalidOperationException>(async () =>
                await sut.AddRoleAsync(user.Id, "   ")
            );
        }

        [Test]
        public async Task AddRoleAsync_Returns_WhenAlreadyInRole()
        {
            using var db = TestDbFactory.CreateDb();
            var um = CreateUserManager();
            var sut = new UserService(db, um.Object);

            var user = new GenUser { Id = Guid.NewGuid(), UserName = "u", Email = "u@x.com", FirstName = "T", LastName = "U" };
            db.Users.Add(user);
            await db.SaveChangesAsync();

            um.Setup(x => x.IsInRoleAsync(user, "Scientist")).ReturnsAsync(true);

            await sut.AddRoleAsync(user.Id, "Scientist");

            um.Verify(x => x.AddToRoleAsync(It.IsAny<GenUser>(), It.IsAny<string>()), Times.Never);
        }

        [Test]
        public async Task AddRoleAsync_Throws_WhenIdentityFails()
        {
            using var db = TestDbFactory.CreateDb();
            var um = CreateUserManager();
            var sut = new UserService(db, um.Object);

            var user = new GenUser { Id = Guid.NewGuid(), UserName = "u", Email = "u@x.com", FirstName = "T", LastName = "U" };
            db.Users.Add(user);
            await db.SaveChangesAsync();

            um.Setup(x => x.IsInRoleAsync(user, "Scientist")).ReturnsAsync(false);
            um.Setup(x => x.AddToRoleAsync(user, "Scientist"))
              .ReturnsAsync(IdentityResult.Failed(new IdentityError { Description = "fail-add" }));

            var ex = Assert.ThrowsAsync<InvalidOperationException>(async () =>
                await sut.AddRoleAsync(user.Id, "Scientist")
            );

            Assert.That(ex!.Message, Does.Contain("fail-add"));
        }

        [Test]
        public void RemoveRoleAsync_Throws_WhenUserMissing()
        {
            using var db = TestDbFactory.CreateDb();
            var um = CreateUserManager();
            var sut = new UserService(db, um.Object);

            Assert.ThrowsAsync<InvalidOperationException>(async () =>
                await sut.RemoveRoleAsync(Guid.NewGuid(), "Scientist")
            );
        }

        [Test]
        public async Task RemoveRoleAsync_Throws_WhenRoleEmpty()
        {
            using var db = TestDbFactory.CreateDb();
            var um = CreateUserManager();
            var sut = new UserService(db, um.Object);

            var user = new GenUser { Id = Guid.NewGuid(), UserName = "u", Email = "u@x.com", FirstName = "T", LastName = "U" };
            db.Users.Add(user);
            await db.SaveChangesAsync();

            Assert.ThrowsAsync<InvalidOperationException>(async () =>
                await sut.RemoveRoleAsync(user.Id, "   ")
            );
        }

        [Test]
        public async Task RemoveRoleAsync_Returns_WhenUserNotInRole()
        {
            using var db = TestDbFactory.CreateDb();
            var um = CreateUserManager();
            var sut = new UserService(db, um.Object);

            var user = new GenUser { Id = Guid.NewGuid(), UserName = "u", Email = "u@x.com", FirstName = "T", LastName = "U" };
            db.Users.Add(user);
            await db.SaveChangesAsync();

            um.Setup(x => x.IsInRoleAsync(user, "Scientist")).ReturnsAsync(false);

            await sut.RemoveRoleAsync(user.Id, "Scientist");

            um.Verify(x => x.RemoveFromRoleAsync(It.IsAny<GenUser>(), It.IsAny<string>()), Times.Never);
        }

        [Test]
        public async Task RemoveRoleAsync_Throws_WhenIdentityFails()
        {
            using var db = TestDbFactory.CreateDb();
            var um = CreateUserManager();
            var sut = new UserService(db, um.Object);

            var user = new GenUser { Id = Guid.NewGuid(), UserName = "u", Email = "u@x.com", FirstName = "T", LastName = "U" };
            db.Users.Add(user);
            await db.SaveChangesAsync();

            um.Setup(x => x.IsInRoleAsync(user, "Scientist")).ReturnsAsync(true);
            um.Setup(x => x.RemoveFromRoleAsync(user, "Scientist"))
              .ReturnsAsync(IdentityResult.Failed(new IdentityError { Description = "fail-remove" }));

            var ex = Assert.ThrowsAsync<InvalidOperationException>(async () =>
                await sut.RemoveRoleAsync(user.Id, "Scientist")
            );

            Assert.That(ex!.Message, Does.Contain("fail-remove"));
        }
    }
}

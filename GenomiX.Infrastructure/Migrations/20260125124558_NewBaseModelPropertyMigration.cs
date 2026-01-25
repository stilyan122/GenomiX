using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GenomiX.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class NewBaseModelPropertyMigration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<Guid>(
                name: "BaseModelId",
                table: "Populations",
                type: "uniqueidentifier",
                nullable: true,
                comment: "Link to the base DNAModel used to derive this population.",
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true,
                oldComment: "Optional link to the base DNAModel used to derive this population.");

            migrationBuilder.CreateIndex(
                name: "IX_Populations_BaseModelId",
                table: "Populations",
                column: "BaseModelId");

            migrationBuilder.AddForeignKey(
                name: "FK_Populations_DNA_Models_BaseModelId",
                table: "Populations",
                column: "BaseModelId",
                principalTable: "DNA_Models",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Populations_DNA_Models_BaseModelId",
                table: "Populations");

            migrationBuilder.DropIndex(
                name: "IX_Populations_BaseModelId",
                table: "Populations");

            migrationBuilder.AlterColumn<Guid>(
                name: "BaseModelId",
                table: "Populations",
                type: "uniqueidentifier",
                nullable: true,
                comment: "Optional link to the base DNAModel used to derive this population.",
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true,
                oldComment: "Link to the base DNAModel used to derive this population.");
        }
    }
}

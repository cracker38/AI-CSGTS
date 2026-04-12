package com.aicsgts.repo;

import com.aicsgts.domain.AppUser;
import com.aicsgts.domain.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface AppUserRepository extends JpaRepository<AppUser, Long> {
  Optional<AppUser> findByEmail(String email);
  List<AppUser> findByDepartment_Id(Long departmentId);

  /** All accounts with a given role (e.g. HR directory = {@link Role#EMPLOYEE} only). */
  List<AppUser> findByRoleOrderByNameAsc(Role role);

  List<AppUser> findByRoleAndJobRole_IdOrderByNameAsc(Role role, Long jobRoleId);

  /**
   * Employees in a department for manager workflows: {@code role = EMPLOYEE}, excluding the
   * signed-in manager by primary key and by work email (covers legacy rows that still look like employees).
   */
  @Query("SELECT u FROM AppUser u WHERE u.department.id = :deptId AND u.role = :role "
      + "AND u.id <> :excludeUserId AND lower(u.email) <> lower(:excludeEmail)")
  List<AppUser> findDirectReportsExcludingManager(
      @Param("deptId") Long deptId,
      @Param("role") Role role,
      @Param("excludeUserId") Long excludeUserId,
      @Param("excludeEmail") String excludeEmail
  );
}

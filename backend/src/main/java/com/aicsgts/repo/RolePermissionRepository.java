package com.aicsgts.repo;

import com.aicsgts.domain.Role;
import com.aicsgts.domain.RolePermission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface RolePermissionRepository extends JpaRepository<RolePermission, Long> {
  @Query("select rp.permission.code from RolePermission rp where rp.role = :role")
  List<String> findPermissionCodesByRole(@Param("role") Role role);

  void deleteByRole(Role role);
}


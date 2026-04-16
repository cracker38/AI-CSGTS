package com.aicsgts.repo;

import com.aicsgts.domain.ProjectAssignment;
import com.aicsgts.domain.Role;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProjectAssignmentRepository extends JpaRepository<ProjectAssignment, Long> {

  /** Managers only staff/track employees — exclude other managers, HR, and admins from counts. */
  long countByProjectIdAndEmployeeDepartmentIdAndEmployeeRole(Long projectId, Long deptId, Role role);

  List<ProjectAssignment> findByProject_IdOrderByPositionAscIdAsc(Long projectId);

  List<ProjectAssignment> findByEmployee_IdOrderByAssignedAtDesc(Long employeeId);
}


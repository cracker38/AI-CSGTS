package com.aicsgts.repo;

import com.aicsgts.domain.TrainingAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface TrainingAssignmentRepository extends JpaRepository<TrainingAssignment, Long> {
  @Query("select ta from TrainingAssignment ta where ta.employee.id = :employeeId order by ta.requestedAt desc")
  List<TrainingAssignment> findByEmployeeId(@Param("employeeId") Long employeeId);

  @Query("select ta from TrainingAssignment ta where ta.status = :status and ta.employee.department.id = :deptId order by ta.requestedAt desc")
  List<TrainingAssignment> findByStatusAndEmployeeDepartmentId(
      @Param("status") TrainingAssignment.Status status,
      @Param("deptId") Long deptId
  );
}


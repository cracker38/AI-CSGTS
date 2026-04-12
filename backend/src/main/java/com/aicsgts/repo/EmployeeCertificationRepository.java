package com.aicsgts.repo;

import com.aicsgts.domain.EmployeeCertification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EmployeeCertificationRepository extends JpaRepository<EmployeeCertification, Long> {
  List<EmployeeCertification> findByEmployeeIdOrderByCreatedAtDesc(Long employeeId);
}
